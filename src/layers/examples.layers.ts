import { Graphics, type TickerCallback } from "pixi.js";
import type { Layer } from "../types";
import { globalScale } from "./config";
import { init } from "./utils";

export const Example1: Layer<{
  visible: boolean;
  r: number;
}> = ({ app, state, container, effects }) => {
  init(state, (state) => {
    state.visible ??= false;
    state.r ??= 0;
  });

  container.x = app.screen.width / 2;
  container.y = app.screen.height / 2;
  container.visible = state.visible;

  const bg = new Graphics().rect(0, 0, app.screen.width, app.screen.height).fill("#000000");
  bg.x = -app.screen.width / 2;
  bg.y = -app.screen.height / 2;
  bg.alpha = 0.5;
  container.addChild(bg);

  const g = new Graphics().circle(0, 0, 100 * globalScale).fill("#ffffff");
  container.addChild(g);

  effects.add(() => {
    const callback: TickerCallback<unknown> = (ticker) => {
      state.r += ((2 * Math.PI) / 2000) * ticker.deltaMS;
      g.x = 200 * globalScale * Math.cos(state.r);
      g.y = 200 * globalScale * Math.sin(state.r);
    };
    app.ticker.add(callback);
    return () => {
      app.ticker.remove(callback);
    };
  });

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "e":
          state.visible = !state.visible;
          container.visible = state.visible;
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
