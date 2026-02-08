import { Text as TextObject } from "pixi.js";
import type { Layer } from "../types";
import { globalScale } from "./config";
import { init } from "./utils";

export const Text: Layer<{
  visible: boolean;
}> = ({ app, state, container, effects }) => {
  init(state, (state) => {
    state.visible ??= false;
  });

  const text = new TextObject({
    text: `DJ XXX`,
    style: {
      fill: "#ffffff",
      fontSize: 420 * globalScale,
      fontFamily: "Phosphate",
    },
    anchor: { x: 0.5, y: 0.615 },
  });
  text.x = app.screen.width / 2;
  text.y = app.screen.height / 2;
  text.alpha = 0.5;
  text.visible = state.visible;
  container.addChild(text);

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "t":
          state.visible = !state.visible;
          text.visible = state.visible;
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
