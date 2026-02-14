import type { TickerCallback } from "pixi.js";
import {
  AsciiFilter,
  CRTFilter,
  GlitchFilter,
  ShockwaveFilter,
  ZoomBlurFilter,
} from "pixi-filters";
import type { Layer } from "../types";
import { globalScale } from "./config";
import { init } from "./utils";

export const Shockwave: Layer<{
  enabled: boolean;
}> = ({ app, emitter, state, filters, effects }) => {
  init(state, (state) => {
    state.enabled ??= false;
  });

  const filter = new ShockwaveFilter();
  filter.centerX = app.screen.width / 2;
  filter.centerY = app.screen.height / 2;
  filter.speed = 2048 * globalScale;
  filter.amplitude = 60 * globalScale;
  filter.enabled = state.enabled;
  filters.append(filter);

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "s":
          state.enabled = !state.enabled;
          filter.enabled = state.enabled;
          break;
        default: // noop
      }
    };
    window.addEventListener("keydown", callback);
    return () => {
      window.removeEventListener("keydown", callback);
    };
  });

  effects.add(() => {
    const callback: TickerCallback<unknown> = (ticker) => {
      filter.time += ticker.deltaMS / 1000;
    };
    app.ticker.add(callback);
    return () => {
      app.ticker.remove(callback);
    };
  });

  effects.add(() => {
    const callback = (): void => {
      filter.time = 0;
    };
    emitter.on("beat", callback);
    return () => {
      emitter.off("beat", callback);
    };
  });

  return [];
};

export const ZoomBlur: Layer<{
  enabled: boolean;
  strength: number;
}> = ({ app, emitter, state, filters, effects }) => {
  init(state, (state) => {
    state.enabled ??= false;
    state.strength ??= 0;
  });

  const filter = new ZoomBlurFilter();
  filter.centerX = app.screen.width / 2;
  filter.centerY = app.screen.height / 2;
  filter.enabled = state.enabled;
  filters.append(filter);

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "z":
          state.enabled = !state.enabled;
          filter.enabled = state.enabled;
          break;
        default: // noop
      }
    };
    window.addEventListener("keydown", callback);
    return () => {
      window.removeEventListener("keydown", callback);
    };
  });

  effects.add(() => {
    const callback: TickerCallback<unknown> = (ticker) => {
      state.strength += ticker.deltaMS / 250;
      filter.strength = state.strength > 0.5 ? 0 : state.strength * globalScale;
    };
    app.ticker.add(callback);
    return () => {
      app.ticker.remove(callback);
    };
  });

  effects.add(() => {
    const callback = (): void => {
      state.strength = 0;
    };
    emitter.on("beat", callback);
    return () => {
      emitter.off("beat", callback);
    };
  });

  return [];
};

export const ASCII: Layer<{
  enabled: boolean;
  size: number;
}> = ({ state, filters, effects }) => {
  init(state, (state) => {
    state.enabled ??= false;
    state.size ??= Math.ceil(13 * globalScale);
  });

  const filter = new AsciiFilter();
  filter.enabled = state.enabled;
  filter.size = state.size;
  filters.append(filter);

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "i":
          state.enabled = !state.enabled;
          filter.enabled = state.enabled;
          break;
        case "j":
          state.size -= 1;
          filter.size = state.size;
          console.log(`asciiFilter.size = ${filter.size}`);
          break;
        case "k":
          state.size += 1;
          filter.size = state.size;
          console.log(`asciiFilter.size = ${filter.size}`);
          break;
        default: // noop
      }
    };
    window.addEventListener("keydown", callback);
    return () => {
      window.removeEventListener("keydown", callback);
    };
  });

  return [];
};

export const Glitch: Layer<{
  enabled: boolean;
}> = ({ emitter, state, filters, effects }) => {
  init(state, (state) => {
    state.enabled ??= false;
  });

  const filter = new GlitchFilter();
  filter.enabled = state.enabled;
  filters.append(filter);

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "g":
          state.enabled = !state.enabled;
          filter.enabled = state.enabled;
          break;
        default: // noop
      }
    };
    window.addEventListener("keydown", callback);
    return () => {
      window.removeEventListener("keydown", callback);
    };
  });

  effects.add(() => {
    const callback = (): void => {
      filter.refresh();
    };
    emitter.on("beat", callback);
    return () => {
      emitter.off("beat", callback);
    };
  });

  return [];
};

export const CRT: Layer<{
  enabled: boolean;
}> = ({ app, state, filters, effects }) => {
  init(state, (state) => {
    state.enabled ??= false;
  });

  const filter = new CRTFilter();
  filter.enabled = state.enabled;
  filters.append(filter);

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "q":
          state.enabled = !state.enabled;
          filter.enabled = state.enabled;
          break;
        default: // noop
      }
    };
    window.addEventListener("keydown", callback);
    return () => {
      window.removeEventListener("keydown", callback);
    };
  });

  effects.add(() => {
    const callback: TickerCallback<unknown> = (ticker) => {
      filter.time += ticker.deltaMS;
    };
    app.ticker.add(callback);
    return () => {
      app.ticker.remove(callback);
    };
  });

  return [];
};
