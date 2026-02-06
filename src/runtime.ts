import type { Application, Filter } from "pixi.js";
import { Container, EventEmitter } from "pixi.js";
import type { AnyLayer, AnyState, Context, Effect, EffectSet, FilterList } from "./types";

declare global {
  // eslint-disable-next-line vars-on-top
  var layerRegistry: Map<string, AnyLayer> | undefined;
  // eslint-disable-next-line vars-on-top
  var rendererRegistry: Set<Renderer> | undefined;
}

const layerRegistry = window.layerRegistry ?? new Map<string, AnyLayer>();
window.layerRegistry = layerRegistry;

const rendererRegistry = window.rendererRegistry ?? new Set<Renderer>();
window.rendererRegistry = rendererRegistry;

function getLayerKey(layer: AnyLayer): unknown {
  return layer.id || layer;
}

class FilterListImpl extends EventEmitter<{ change: [] }> implements FilterList {
  #filters: Filter[];
  #index: number;

  constructor() {
    super();
    this.#filters = [];
    this.#index = 0;
  }

  append(filter: Filter): void {
    this.#filters.push(filter);
    this.emit("change");
  }

  remove(filter: Filter): void {
    const i = this.#filters.indexOf(filter);
    if (i < 0) {
      return;
    }
    this.#filters.splice(i, 1);
    this.emit("change");
  }

  get index(): number {
    return this.#index;
  }

  set index(value: number) {
    this.#index = value;
    this.emit("change");
  }

  getAll(): Filter[] {
    return this.#filters.slice();
  }
}

class EffectSetImpl implements EffectSet {
  #effects: Set<Effect>;

  constructor() {
    this.#effects = new Set();
  }

  add(effect: Effect): void {
    this.#effects.add(effect);
  }

  run(): () => void {
    const cleanups: Array<() => void> = [];
    for (const effect of this.#effects) {
      try {
        cleanups.push(effect());
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(new Error("Error while running effect", { cause: err }));
      }
    }
    cleanups.reverse();
    return (): void => {
      for (const cleanup of cleanups) {
        try {
          cleanup();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(new Error("Error while running effect cleanup", { cause: err }));
        }
      }
    };
  }
}

class ContainerFilterManager {
  private readonly container: Container;
  private readonly children: Map<FilterListImpl, () => void>;

  constructor(container: Container) {
    this.container = container;
    this.children = new Map();
  }

  addChild(filters: FilterListImpl): void {
    this._addChild(filters);
    this.updateContainerFilters();
  }

  private _addChild(filters: FilterListImpl): void {
    const handleChange = (): void => {
      this.updateContainerFilters();
    };
    this.children.set(filters, handleChange);
    filters.addListener("change", handleChange);
  }

  removeChild(filters: FilterListImpl): void {
    if (this._removeChild(filters)) {
      this.updateContainerFilters();
    }
  }

  private _removeChild(filters: FilterListImpl): boolean {
    const handleChange = this.children.get(filters);
    if (!handleChange) {
      return false;
    }
    this.children.delete(filters);
    filters.removeListener("change", handleChange);
    return true;
  }

  removeChildren(): void {
    for (const filters of this.children.keys()) {
      this._removeChild(filters);
    }
    this.updateContainerFilters();
  }

  private updateContainerFilters(): void {
    const filters = [...this.children.keys()]
      .sort((a, b) => a.index - b.index)
      .flatMap((a) => a.getAll());
    this.container.filters = filters;
  }
}

class Node {
  readonly app: Application;
  readonly emitter: EventEmitter;
  readonly layer: AnyLayer;
  readonly state: AnyState;
  readonly container: Container;
  readonly filters: FilterListImpl;
  readonly effect: Effect;
  readonly children: ReadonlyMap<unknown, { index: number; node: Node }>;

  constructor(args: {
    app: Application;
    emitter: EventEmitter;
    layer: AnyLayer;
    state: AnyState;
    container: Container;
    filters: FilterListImpl;
    effect: Effect;
    children: ReadonlyMap<unknown, { index: number; node: Node }>;
  }) {
    this.app = args.app;
    this.emitter = args.emitter;
    this.layer = args.layer;
    this.state = args.state;
    this.container = args.container;
    this.filters = args.filters;
    this.effect = args.effect;
    this.children = args.children;
  }

  async render(options?: { signal?: AbortSignal }): Promise<Node> {
    const abortController = new AbortController();
    if (options?.signal) {
      if (options.signal.aborted) {
        abortController.abort();
      } else {
        options.signal.addEventListener("abort", abortController.abort.bind(abortController), {
          once: true,
        });
      }
    }
    const signal = abortController.signal;

    const container = new Container();
    const containerFilters = new ContainerFilterManager(container);
    const filters = new FilterListImpl();
    const effects = new EffectSetImpl();

    const context: Context<AnyState> = {
      app: this.app,
      emitter: this.emitter,
      state: this.state,
      container,
      filters,
      effects,
      signal,
    };
    const layer = (this.layer.id ? layerRegistry.get(this.layer.id) : undefined) ?? this.layer;
    const childLayers = await layer(context);

    signal.throwIfAborted();

    const oldChildren = new Map<unknown, { index: number; node: Node }>();
    for (const [index, childLayer] of childLayers.entries()) {
      const key = getLayerKey(childLayer);
      if (oldChildren.has(key)) {
        // eslint-disable-next-line no-console
        console.warn(`skip duplicate layer: ${String(key)}`);
        continue;
      }
      const child = this.children.get(key);
      if (child) {
        oldChildren.set(key, { index, node: child.node });
      } else {
        const newNode = new Node({
          app: this.app,
          emitter: this.emitter,
          layer: childLayer,
          state: {},
          container: new Container(),
          filters: new FilterListImpl(),
          effect: () => () => {},
          children: new Map(),
        });
        oldChildren.set(key, { index, node: newNode });
      }
    }

    const children = new Map(
      await Promise.all(
        [...oldChildren].map(
          async ([key, { index, node: oldNode }]): Promise<
            [key: unknown, { index: number; node: Node }]
          > => {
            try {
              const node = await oldNode.render({ signal });
              return [key, { index, node }];
            } catch (err) {
              abortController.abort();
              throw err;
            }
          },
        ),
      ),
    );

    signal.throwIfAborted();

    for (const { index, node } of children.values()) {
      node.container.zIndex = index;
      container.addChild(node.container);
      node.filters.index = index;
      containerFilters.addChild(node.filters);
    }

    const effect: Effect = () => {
      const cleanups: Array<() => void> = [];
      for (const { node } of children.values()) {
        cleanups.push(node.effect());
      }
      cleanups.push(effects.run());
      cleanups.reverse();
      return () => {
        for (const cleanup of cleanups) {
          cleanup();
        }
      };
    };

    const node = new Node({
      app: this.app,
      emitter: this.emitter,
      layer,
      state: this.state,
      container,
      filters,
      effect,
      children,
    });

    return node;
  }
}

export class Renderer {
  readonly app: Application;
  readonly emitter: EventEmitter;
  readonly container: Container;
  private readonly containerFilters: ContainerFilterManager;

  private node: Node | null;
  private cleanup: (() => void) | null;
  private abortController: AbortController | null;

  constructor(args: { app: Application }) {
    this.app = args.app;
    this.emitter = new EventEmitter();
    this.container = new Container();
    this.containerFilters = new ContainerFilterManager(this.container);

    this.node = null;
    this.cleanup = null;
    this.abortController = null;

    rendererRegistry.add(this);
  }

  render(layer: AnyLayer): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    let oldNode: Node;
    if (this.node && getLayerKey(layer) === getLayerKey(this.node.layer)) {
      oldNode = this.node;
    } else {
      oldNode = new Node({
        app: this.app,
        emitter: this.emitter,
        layer,
        state: {},
        container: new Container(),
        filters: new FilterListImpl(),
        effect: () => () => {},
        children: new Map(),
      });
    }

    oldNode
      .render({ signal })
      .then((newNode) => {
        signal.throwIfAborted();
        this.abortController = null;

        this.container.removeChildren();
        this.containerFilters.removeChildren();
        this.cleanup?.();

        this.node = newNode;

        this.container.addChild(newNode.container);
        this.containerFilters.addChild(newNode.filters);
        this.cleanup = newNode.effect();
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        if ((err as any)?.name === "AbortError") {
          // eslint-disable-next-line no-console
          console.log("Rendering aborted");
        } else {
          // eslint-disable-next-line no-console
          console.error(new Error("Error while rendering", { cause: err }));
        }
      });
  }

  rerender(): void {
    if (!this.node) {
      return;
    }
    this.render(this.node.layer);
  }

  dispose(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = null;

    this.container.removeChildren();
    this.containerFilters.removeChildren();
    this.cleanup?.();

    this.node = null;

    rendererRegistry.delete(this);
  }
}
