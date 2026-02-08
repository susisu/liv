import { Graphics } from "pixi.js";
import type { Layer } from "../types";
import { globalScale } from "./config";
import { init } from "./utils";

export const SMTPPP: Layer<{
  visible: boolean;
}> = ({ app, state, container, effects }) => {
  init(state, (state) => {
    state.visible ??= false;
  });

  const smtppp = new Graphics().svg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <g>
          <path d="M 119.716 18.441 l -6.608 0.957 l 0.028 -6.648 l -2.43 0.352 a 2.8 2.8 0 0 0 -2.377 2.771 l -0.015 4.218 l -5.076 0.735 V 12.4 l 4.179 -0.593 a 2.8 2.8 0 0 0 2.377 -2.791 l -0.01 -3.005 l -6.546 0.987 v -6.933 l -2.465 0.312 a 2.8 2.8 0 0 0 -2.377 2.771 l -0.015 4.514 l -4.67 0.676 c -1.335 -3.88 -4.613 -6.017 -9.322 -5.378 l -37.307 5.313 l 0.011 -8.273 l -5.692 0.816 a 2.762 2.762 0 0 0 -1.9 1.2 l -8.026 11.941 l -8 -10.484 l -8.049 1.227 c -7.912 1.192 -12.049 3.4 -13.06 9.261 c -1.234 7.222 4.224 9.334 8.376 10.68 c 2.412 0.819 4.122 1.8 3.79 3.886 c -0.414 2.317 -2.269 3.137 -5.72 3.677 c -1.834 0.287 -4.511 0.675 -6.431 0.95 A 2.792 2.792 0 0 0 0 35.929 l 0 3.723 l 8.169 -1.107 c 7.938 -1.5 12.229 -3.272 13.364 -9.407 c 1.1 -5.953 -2.1 -9.138 -5.717 -10.457 c -3.442 -1.235 -7.04 -1.831 -6.588 -4.33 c 0.414 -2.317 2.456 -3.063 6.205 -3.694 c 0.573 -0.1 3.032 -0.442 4.983 -0.714 l 11.471 15.108 l 8.306 -12.757 l 0.028 21.453 l 4.448 -0.633 a 2.8 2.8 0 0 0 2.383 -2.778 l 0.022 -16.279 l 9.029 -1.3 l -0.016 26.889 l 4.487 -0.61 a 2.8 2.8 0 0 0 2.4 -2.783 l 0.014 -24.535 l 20.385 -2.884 c 2.555 -0.348 4.056 1.1 4.042 4.275 c 0.02 3.122 -1.459 5.023 -4.014 5.37 l -4.072 0.553 l 0 -4.888 l -4.5 0.558 A 2.8 2.8 0 0 0 72.4 17.5 l 0 19.762 l 4.525 -0.615 a 2.8 2.8 0 0 0 2.4 -2.79 l -0.014 -6.65 a 2.8 2.8 0 0 1 2.4 -2.79 l 2.662 -0.362 c 5.974 -0.811 9.639 -4.393 9.976 -10.355 l 4.052 -0.587 l 0.012 13.881 l 9.92 -1.449 l 0.012 6.592 l 2.759 -0.4 a 2.291 2.291 0 0 0 2 -2.611 v -4.271 l 4.241 -0.617 a 2.8 2.8 0 0 0 2.377 -2.791 Z" fill="#ffffff" />
        </g>
      </svg>
    `);
  smtppp.pivot.set(smtppp.width / 2, smtppp.height / 2);
  smtppp.x = app.screen.width / 2;
  smtppp.y = app.screen.height / 2;
  smtppp.scale.set(10 * globalScale);
  smtppp.alpha = 0.5;
  smtppp.visible = state.visible;
  container.addChild(smtppp);

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "p":
          state.visible = !state.visible;
          smtppp.visible = state.visible;
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
