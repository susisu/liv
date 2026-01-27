import type { Application } from "pixi.js";
import { Container } from "pixi.js";
import type { AnyLayer, Context } from "./types";

function getLayerKey(layer: AnyLayer): unknown {
  return layer.id || layer.name || layer;
}

class LayerInstance {
  private readonly app: Application;
  private layer: AnyLayer;

  private readonly state: Record<string, unknown>;

  private currentContainer: Container | null;
  private currentChildren: ReadonlyMap<unknown, LayerInstanceChild> | null;

  constructor(args: { app: Application; layer: AnyLayer }) {
    this.app = args.app;
    this.layer = args.layer;

    this.state = {};

    this.currentContainer = null;
    this.currentChildren = null;
  }

  async render(): Promise<{
    container: Container;
    cleanup: () => void;
  }> {
    const container = new Container();
    const cleanups: Array<() => void> = [];
    const children = new Map<unknown, LayerInstanceChild>();

    const context: Context<Record<string, unknown>> = {
      app: this.app,
      state: this.state,
      container,
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
          await this.renderChild(container, child);
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
    this.currentChildren = children;

    return { container, cleanup };
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
        this.renderChild(this.currentContainer, child).catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error(err);
        });
      }
    }
    return false;
  }

  private async renderChild(container: Container | null, child: LayerInstanceChild): Promise<void> {
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
    }
  }
}

type LayerInstanceChild = {
  index: number;
  instance: LayerInstance;
  abort?: (() => void) | undefined;
  container?: Container | undefined;
  cleanup?: (() => void) | undefined;
};

class Root {
  readonly container: Container;

  private currentChild: RootChild;

  constructor(layerInstance: LayerInstance) {
    this.container = new Container();

    this.currentChild = {
      instance: layerInstance,
    };
  }

  render(): void {
    this.renderChild(this.container, this.currentChild).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
  }

  acceptLayerUpdate(layer: AnyLayer): void {
    const accepted = this.currentChild.instance.acceptLayerUpdate(layer);
    if (accepted) {
      this.renderChild(this.container, this.currentChild).catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error(err);
      });
    }
  }

  private async renderChild(container: Container, child: RootChild): Promise<void> {
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
    }
  }

  dispose(): void {
    this.currentChild.abort?.();
    this.currentChild.abort = undefined;

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
