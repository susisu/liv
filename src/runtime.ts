import type { Application, Filter } from "pixi.js";
import { Container, EventEmitter } from "pixi.js";
import type { AnyLayer, Context, Filters } from "./types";

function getLayerKey(layer: AnyLayer): unknown {
  return layer.id || layer.name || layer;
}

class FiltersImpl extends EventEmitter<{ change: [] }> implements Filters {
  private _filters: Set<Filter>;
  private _zIndex: number;

  constructor() {
    super();
    this._filters = new Set();
    this._zIndex = 0;
  }

  getAll(): Filter[] {
    return [...this._filters];
  }

  add(filter: Filter): void {
    this._filters.add(filter);
    this.emit("change");
  }

  remove(filter: Filter): void {
    this._filters.delete(filter);
    this.emit("change");
  }

  get zIndex(): number {
    return this._zIndex;
  }

  set zIndex(value: number) {
    this._zIndex = value;
    this.emit("change");
  }
}

class ContainerFilters {
  private readonly container: Container;

  private readonly children: Map<FiltersImpl, () => void>;

  constructor(container: Container) {
    this.container = container;

    this.children = new Map();
  }

  addChild(filters: FiltersImpl): void {
    this._addChild(filters);
    this.updateContainerFilters();
  }

  private _addChild(filters: FiltersImpl): void {
    const handleChange = (): void => {
      this.updateContainerFilters();
    };
    this.children.set(filters, handleChange);
    filters.addListener("change", handleChange);
  }

  removeChild(filters: FiltersImpl): void {
    if (this._removeChild(filters)) {
      this.updateContainerFilters();
    }
  }

  private _removeChild(filters: FiltersImpl): boolean {
    const handleChange = this.children.get(filters);
    if (!handleChange) {
      return false;
    }
    filters.removeListener("change", handleChange);
    this.children.delete(filters);
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
      .sort((a, b) => a.zIndex - b.zIndex)
      .flatMap((a) => a.getAll());
    this.container.filters = filters;
  }
}

class LayerInstance {
  private readonly app: Application;
  private layer: AnyLayer;

  private readonly state: Record<string, unknown>;

  private currentContainer: Container | null;
  private currentContainerFilters: ContainerFilters | null;
  private currentChildren: ReadonlyMap<unknown, LayerInstanceChild> | null;

  constructor(args: { app: Application; layer: AnyLayer }) {
    this.app = args.app;
    this.layer = args.layer;

    this.state = {};

    this.currentContainer = null;
    this.currentContainerFilters = null;
    this.currentChildren = null;
  }

  async render(): Promise<{
    container: Container;
    filters: FiltersImpl;
    cleanup: () => void;
  }> {
    const container = new Container();
    const containerFilters = new ContainerFilters(container);
    const filters = new FiltersImpl();
    const cleanups: Array<() => void> = [];
    const children = new Map<unknown, LayerInstanceChild>();

    const context: Context<Record<string, unknown>> = {
      app: this.app,
      state: this.state,
      container,
      filters,
      cleanups,
    };
    const childLayers = await this.layer.call(undefined, context);

    for (const [index, layer] of childLayers.entries()) {
      const key = getLayerKey(layer);
      if (children.has(key)) {
        // skip duplicate layers
        continue;
      }
      const child = this.currentChildren?.get(key);
      if (child) {
        children.set(key, { index, instance: child.instance });
      } else {
        const instance = new LayerInstance({ app: this.app, layer });
        children.set(key, { index, instance });
      }
    }

    await Promise.all(
      [...children.values()].map(async (child) => {
        try {
          await this.renderChild(container, containerFilters, child);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }),
    );

    const cleanup = (): void => {
      for (const child of children.values()) {
        child.abort?.();
        try {
          child.cleanup?.call(undefined);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
      for (const func of cleanups) {
        try {
          func();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    };

    this.currentContainer = container;
    this.currentContainerFilters = containerFilters;
    this.currentChildren = children;

    return { container, filters, cleanup };
  }

  acceptLayerUpdate(layer: AnyLayer): boolean {
    const key = getLayerKey(layer);
    const thisKey = getLayerKey(this.layer);
    if (key === thisKey) {
      this.layer = layer;
      return true;
    }
    if (!this.currentChildren) {
      return false;
    }
    for (const child of this.currentChildren.values()) {
      const accepted = child.instance.acceptLayerUpdate(layer);
      if (accepted) {
        this.renderChild(this.currentContainer, this.currentContainerFilters, child).catch(
          (err: unknown) => {
            // eslint-disable-next-line no-console
            console.error(err);
          },
        );
      }
    }
    return false;
  }

  private async renderChild(
    container: Container | null,
    containerFilters: ContainerFilters | null,
    child: LayerInstanceChild,
  ): Promise<void> {
    child.abort?.();

    const controller = new AbortController();
    child.abort = () => {
      controller.abort();
    };

    const result = await child.instance.render();

    if (controller.signal.aborted) {
      try {
        result.cleanup.call(undefined);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    } else {
      // eslint-disable-next-line require-atomic-updates
      child.abort = undefined;

      if (child.filters) {
        containerFilters?.removeChild(child.filters);
      }
      if (child.container) {
        container?.removeChild(child.container);
      }
      try {
        child.cleanup?.call(undefined);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      child.cleanup = result.cleanup;
      child.container = result.container;
      child.container.zIndex = child.index;
      container?.addChild(child.container);
      child.filters = result.filters;
      child.filters.zIndex = child.index;
      containerFilters?.addChild(child.filters);
    }
  }
}

type LayerInstanceChild = {
  index: number;
  instance: LayerInstance;
  abort?: (() => void) | undefined;
  container?: Container | undefined;
  filters?: FiltersImpl | undefined;
  cleanup?: (() => void) | undefined;
};

class Root {
  readonly container: Container;
  private readonly containerFilters: ContainerFilters;

  private currentChild: RootChild;

  constructor(layerInstance: LayerInstance) {
    this.container = new Container();
    this.containerFilters = new ContainerFilters(this.container);

    this.currentChild = {
      instance: layerInstance,
    };
  }

  render(): void {
    this.renderChild(this.container, this.containerFilters, this.currentChild).catch(
      (err: unknown) => {
        // eslint-disable-next-line no-console
        console.error(err);
      },
    );
  }

  acceptLayerUpdate(layer: AnyLayer): void {
    const accepted = this.currentChild.instance.acceptLayerUpdate(layer);
    if (accepted) {
      this.renderChild(this.container, this.containerFilters, this.currentChild).catch(
        (err: unknown) => {
          // eslint-disable-next-line no-console
          console.error(err);
        },
      );
    }
  }

  private async renderChild(
    container: Container,
    containerFilters: ContainerFilters,
    child: RootChild,
  ): Promise<void> {
    child.abort?.();

    const controller = new AbortController();
    child.abort = () => {
      controller.abort();
    };

    const result = await child.instance.render();

    if (controller.signal.aborted) {
      try {
        result.cleanup.call(undefined);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    } else {
      // eslint-disable-next-line require-atomic-updates
      child.abort = undefined;

      if (child.filters) {
        containerFilters.removeChild(child.filters);
      }
      if (child.container) {
        container.removeChild(child.container);
      }
      try {
        child.cleanup?.call(undefined);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      child.cleanup = result.cleanup;
      child.container = result.container;
      container.addChild(child.container);
      child.filters = result.filters;
      containerFilters.addChild(child.filters);
    }
  }

  dispose(): void {
    this.currentChild.abort?.();
    this.currentChild.abort = undefined;

    this.containerFilters.removeChildren();
    this.container.removeChildren();
    try {
      this.currentChild.cleanup?.call(undefined);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }

    this.currentChild.cleanup = undefined;
  }
}

type RootChild = {
  instance: LayerInstance;
  abort?: (() => void) | undefined;
  container?: Container | undefined;
  filters?: FiltersImpl | undefined;
  cleanup?: (() => void) | undefined;
};

const rootRegistry: Set<Root> = new Set();

export class Runtime {
  readonly app: Application;

  constructor(args: { app: Application }) {
    this.app = args.app;
  }

  render(layer: AnyLayer): {
    container: Container;
    dispose: () => void;
  } {
    const instance = new LayerInstance({ app: this.app, layer });
    const root = new Root(instance);
    root.render();
    rootRegistry.add(root);
    return {
      container: root.container,
      dispose: () => {
        rootRegistry.delete(root);
        root.dispose();
      },
    };
  }
}

export function acceptLayerUpdate(layer: AnyLayer): void {
  for (const root of rootRegistry) {
    root.acceptLayerUpdate(layer);
  }
}
