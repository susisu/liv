import type { TickerCallback } from "pixi.js";
import type { Layer } from "../types";
import { Analyser } from "./analyser.layers";
import { ASCII, CRT, Glitch, Shockwave, ZoomBlur } from "./filters.layers";
import { Game } from "./game.layers";
import { Rhythm } from "./rhythm.layers";
import { SMTPPP } from "./smtppp.layers";
import { Text } from "./text.layers";
import { init } from "./utils";

const Stage: Layer = () => {
  return [Rhythm, SMTPPP, Text, Analyser, Game, Shockwave, ZoomBlur, ASCII, Glitch, CRT];
};

const Rotation: Layer<{
  rotationEnabled: boolean;
  rotation: number;
  rotationVelocity: number;
}> = ({ app, state, container, effects }) => {
  init(state, (state) => {
    state.rotationEnabled ??= false;
    state.rotation ??= 0;
    state.rotationVelocity ??= 0;
  });

  container.pivot.set(app.screen.width / 2, app.screen.height / 2);
  container.x = app.screen.width / 2;
  container.y = app.screen.height / 2;
  container.rotation = state.rotation;

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "r":
          if (event.ctrlKey) {
            state.rotationEnabled = false;
            state.rotation = 0;
            state.rotationVelocity = 0;
            container.rotation = state.rotation;
          } else {
            state.rotationEnabled = !state.rotationEnabled;
          }
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

  return [Stage];
};

const Mirror: Layer<{
  mirror: boolean;
}> = ({ app, state, container, effects }) => {
  init(state, (state) => {
    state.mirror ??= false;
  });

  container.pivot.set(app.screen.width / 2, app.screen.height / 2);
  container.x = app.screen.width / 2;
  container.y = app.screen.height / 2;
  container.scale.x = state.mirror ? -1 : 1;

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "m":
          state.mirror = !state.mirror;
          container.scale.x = state.mirror ? -1 : 1;
          break;
        default: // noop
      }
    };
    window.addEventListener("keydown", callback);
    return () => {
      window.removeEventListener("keydown", callback);
    };
  });

  return [Rotation];
};

export const Background: Layer = () => {
  return [Mirror];
};
