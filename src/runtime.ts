import type { Application } from "pixi.js";
import { Container } from "pixi.js";

export type Layer = {
  (context: Context): Layer[] | Promise<Layer[]>;
  id?: string;
};

export type Context = Readonly<{
  app: Application;
  state: Record<string, unknown>;
  container: Container;
  cleanups: Array<() => void>;
}>;

class LayerInstance {
  readonly app: Application;
  readonly layer: Layer;

  private readonly state: Record<string, unknown>;

  private currentContainer: Container | null;
  private currentChildren: ReadonlyMap<unknown, LayerInstanceChild> | null;

  constructor(args: { app: Application; layer: Layer }) {
    this.app = args.app;
    this.layer = args.layer;

    this.state = {};
    this.currentContainer = null;
    this.currentChildren = null;
  }

  async render(): Promise<RenderResult> {
    const container = new Container();
    const cleanups: Array<() => void> = [];
    const children = new Map<unknown, LayerInstanceChild>();

    const context: Context = {
      app: this.app,
      state: this.state,
      container,
      cleanups,
    };
    const layers = await this.layer.call(undefined, context);

    for (const [index, layer] of layers.entries()) {
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
        if (child.abort) {
          child.abort();
        }
        if (child.cleanup) {
          try {
            child.cleanup.call(undefined);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
          }
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

  updateLayer(layer: Layer): void {
    if (!this.currentContainer || !this.currentChildren) {
      return;
    }
    const key = getLayerKey(layer);
    for (const [childKey, child] of this.currentChildren) {
      if (key === childKey) {
        this.renderChild(this.currentContainer, child).catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error(err);
        });
      } else {
        child.instance.updateLayer(layer);
      }
    }
  }

  private async renderChild(container: Container, child: LayerInstanceChild): Promise<void> {
    if (child.abort) {
      child.abort();
    }
    const prevCleanup = child.cleanup;
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
      container.addChildAt(result.container, child.index);
      child.cleanup = result.cleanup;
      if (prevCleanup) {
        try {
          prevCleanup();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
      child.abort = undefined;
    }
  }
}

type LayerInstanceChild = {
  index: number;
  instance: LayerInstance;
  abort?: (() => void) | undefined;
  cleanup?: (() => void) | undefined;
};

type RenderResult = {
  container: Container;
  cleanup: () => void;
};

function getLayerKey(layer: Layer): unknown {
  return layer.id || layer.name || layer;
}
