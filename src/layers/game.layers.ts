import type { TickerCallback } from "pixi.js";
import { ColorMatrixFilter, Graphics } from "pixi.js";
import type { Layer } from "../types";
import { sprites, unit } from "./gameConfig";
import { init } from "./utils";

export const Game: Layer<{
  x: number;
  y: number;
  vx: number;
  vy: number;
  hDirection: "right" | "left";
  vDirection: "neutral" | "up" | "down";
  hue: number;
  beatTime: number;
  number: 0 | 1 | 3;
  autoMode: boolean;
  partyMode: boolean;
  groundVisible: boolean;
}> = ({ app, emitter, state, container, effects }) => {
  init(state, (state) => {
    state.x ??= app.screen.width / 2;
    state.y ??= app.screen.height / 2 - unit * 4;
    state.vx ??= 0;
    state.vy ??= 0;
    state.hDirection ??= "right";
    state.vDirection ??= "neutral";
    state.hue ??= 0;
    state.beatTime ??= 0;
    state.number ??= 0;
    state.autoMode ??= false;
    state.partyMode ??= false;
    state.groundVisible ??= false;
  });

  const filter = new ColorMatrixFilter();
  filter.hue(state.hue, false);

  const characterLeft = new Graphics(sprites[state.hDirection][state.vDirection]);
  characterLeft.pivot.set(unit * 4, unit * 4);
  characterLeft.filters = [filter];
  container.addChild(characterLeft);

  const characterRight = new Graphics(sprites[state.hDirection][state.vDirection]);
  characterRight.pivot.set(unit * 4, unit * 4);
  characterRight.filters = [filter];
  container.addChild(characterRight);

  const character = new Graphics(sprites[state.hDirection][state.vDirection]);
  character.pivot.set(unit * 4, unit * 4);
  character.filters = [filter];
  container.addChild(character);

  const shadow = new Graphics(sprites[state.hDirection][state.vDirection]);
  shadow.pivot.set(unit * 4, unit * 4);
  shadow.alpha = Math.max(0.5 * (1 - state.beatTime / 30), 0);
  shadow.scale.set(1 + state.beatTime / 30);
  shadow.filters = [filter];
  container.addChild(shadow);

  const ground = new Graphics()
    .rect(-app.screen.width / 2, app.screen.height / 2, app.screen.width * 2, app.screen.height * 2)
    .fill("#ff0000");
  ground.visible = state.groundVisible;
  ground.alpha = 0.5;
  ground.filters = [filter];
  container.addChild(ground);

  function updatePosition(): void {
    character.x = state.x;
    character.y = state.y;
    character.context = sprites[state.hDirection][state.vDirection];

    shadow.x = character.x;
    shadow.y = character.y;
    shadow.context = character.context;

    characterLeft.x = character.x - unit * 16;
    characterLeft.y = character.y;
    characterLeft.context = character.context;

    characterRight.x = character.x + unit * 16;
    characterRight.y = character.y;
    characterRight.context = character.context;
  }

  function updateVisibility(): void {
    characterLeft.visible = state.number >= 3;
    characterRight.visible = state.number >= 3;
    character.visible = state.number >= 1;
    shadow.visible = state.number >= 1;
  }

  updatePosition();
  updateVisibility();

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "ArrowRight":
          state.hDirection = "right";
          state.vDirection = "neutral";
          state.vx += 16;
          break;
        case "ArrowLeft":
          state.hDirection = "left";
          state.vDirection = "neutral";
          state.vx -= 16;
          break;
        case " ":
          state.vy = -24;
          break;
        case "v":
          state.vy = -24;
          break;
        case "c":
          state.hue = (state.hue + 3) % 360;
          filter.hue(state.hue, false);
          break;
        case "d":
          state.hue = (state.hue - 3 + 360) % 360;
          filter.hue(state.hue, false);
          break;
        case "C":
          state.hue = (state.hue + 12) % 360;
          filter.hue(state.hue, false);
          break;
        case "D":
          state.hue = (state.hue - 12 + 360) % 360;
          filter.hue(state.hue, false);
          break;
        case "a":
          state.autoMode = !state.autoMode;
          break;
        case "x":
          state.partyMode = !state.partyMode;
          break;
        case "0":
          state.number = 0;
          updateVisibility();
          break;
        case "1":
          state.number = 1;
          updateVisibility();
          break;
        case "3":
          state.number = 3;
          updateVisibility();
          break;
        case "y":
          state.groundVisible = !state.groundVisible;
          ground.visible = state.groundVisible;
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
      state.beatTime += ticker.deltaTime;

      const ax = 0;
      const ay = 2;
      state.vx = (state.vx + ax * ticker.deltaTime) * 0.9;
      state.vy = state.vy + ay * ticker.deltaTime;
      state.x += state.vx * ticker.deltaTime;
      state.y += state.vy * ticker.deltaTime;
      if (state.x < -unit * 8) {
        state.x = -unit * 8;
      }
      if (state.x > app.screen.width + unit * 8) {
        state.x = app.screen.width + unit * 8;
      }

      if (state.vy < 0 && state.vDirection !== "up") {
        state.vDirection = "up";
      } else if (state.vy > 0 && state.vDirection !== "down") {
        state.vDirection = "down";
      }

      if (state.y > app.screen.height / 2 - unit * 4 && state.vy > 0) {
        state.y = app.screen.height / 2 - unit * 4;
        state.vy = 0;
        state.vDirection = "neutral";
        emitter.emit("moveCharacter", state.x);
      }

      updatePosition();

      shadow.alpha = Math.max(0.5 * (1 - state.beatTime / 30), 0);
      shadow.scale.set(1 + state.beatTime / 30);

      if (state.partyMode) {
        state.hue = (state.hue + 2) % 360;
        filter.hue(state.hue, false);
      }
    };
    app.ticker.add(callback);
    return () => {
      app.ticker.remove(callback);
    };
  });

  effects.add(() => {
    const callback = (): void => {
      state.beatTime = 0;

      if (state.autoMode) {
        const r = Math.floor(Math.random() * 3);
        switch (r) {
          case 0:
            state.hDirection = "right";
            state.vDirection = "neutral";
            state.vx += 16;
            break;
          case 1:
            state.hDirection = "left";
            state.vDirection = "neutral";
            state.vx -= 16;
            break;
          case 2:
            state.vy = -24;
            break;
          default: // noop
        }
      }
    };
    emitter.on("beat", callback);
    return () => {
      emitter.off("beat", callback);
    };
  });

  return [];
};
