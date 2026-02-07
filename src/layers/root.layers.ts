import type { TickerCallback } from "pixi.js";
import type { Layer } from "../types";
import { ASCII, CRT, Glitch, Shockwave, ZoomBlur } from "./filters.layers";
import { Rhythm } from "./rhythm.layers";
import { SMTPPP } from "./smtppp.layers";
import { init } from "./utils";
import { Analyser } from "./analyser.layers";
import { Game } from "./game.layers";

export const Root: Layer<{
  rotation: number;
  rotationEnabled: boolean;
  rotationVelocity: number;
  mirror: boolean;
}> = ({ app, state, container, effects }) => {
  init(state, (state) => {
    state.rotation ??= 0;
    state.rotationEnabled ??= false;
    state.rotationVelocity ??= 0;
    state.mirror ??= false;
  });

  app.stage.pivot.set(app.screen.width / 2, app.screen.height / 2);
  app.stage.x = app.screen.width / 2;
  app.stage.y = app.screen.height / 2;
  app.stage.scale.x = state.mirror ? -1 : 1;

  container.pivot.set(app.screen.width / 2, app.screen.height / 2);
  container.x = app.screen.width / 2;
  container.y = app.screen.height / 2;
  container.rotation = state.rotation;

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "r":
          state.rotationEnabled = !state.rotationEnabled;
          break;
        case "m":
          state.mirror = !state.mirror;
          app.stage.scale.x = state.mirror ? -1 : 1;
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
      state.rotationVelocity *= 0.98;
      if (state.rotationEnabled) {
        state.rotationVelocity = 0.005;
      }
      state.rotation += state.rotationVelocity * ticker.deltaTime;
      container.rotation = state.rotation;
    };
    app.ticker.add(callback);
    return () => {
      app.ticker.remove(callback);
    };
  });

  return [Rhythm, SMTPPP, Analyser, Game, Shockwave, ZoomBlur, ASCII, Glitch, CRT];
};
