import type { Texture } from "pixi.js";
import { Assets, Sprite } from "pixi.js";
import type { Layer } from "../types";
import { init } from "./utils";

const maxPage = 5;

function getPath(page: number): string {
  return `/assets/slides/${page}.png`;
}

export const Slides: Layer<{
  visible: boolean;
  page: number;
}> = async ({ app, state, container, effects }) => {
  init(state, (state) => {
    state.visible ??= true;
    state.page ??= 1;
  });

  const textures = await Assets.load<Texture>(
    Array.from({ length: maxPage }).map((_, i) => getPath(i + 1)),
  );
  console.log(textures);

  const sprite = new Sprite();
  const width = app.screen.width;
  const height = width * (9 / 16);
  sprite.x = (app.screen.width - width) / 2;
  sprite.y = (app.screen.height - height) / 2;
  sprite.width = width;
  sprite.height = height;
  sprite.blendMode = "add";
  sprite.visible = state.visible;
  sprite.texture = textures[getPath(state.page)];
  container.addChild(sprite);

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case ",":
          state.page = Math.max(state.page - 1, 1);
          sprite.texture = textures[getPath(state.page)];
          break;
        case ".":
          state.page = Math.min(state.page + 1, maxPage);
          sprite.texture = textures[getPath(state.page)];
          break;
        case "/":
          state.visible = !state.visible;
          sprite.visible = state.visible;
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
