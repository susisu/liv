import type { TickerCallback } from "pixi.js";
import { Text } from "pixi.js";
import type { Layer } from "../types";
import { init } from "./utils";

export const Rhythm: Layer<{
  bpm: number;
  rate: number;
  clockMS: number;
  lastBeatMS: number;
}> = ({ app, emitter, state, container, effects }) => {
  init(state, (state) => {
    state.bpm ??= 120;
    state.rate ??= 1;
    state.clockMS ??= 0;
    state.lastBeatMS ??= 0;
  });

  const text = new Text({
    text: "",
    style: {
      fill: "#ffffff",
      fontSize: 32,
      fontFamily: "Futura",
    },
    anchor: 0,
  });
  text.alpha = 0.5;
  container.addChild(text);

  function update(newBPM: number, newRate: number): void {
    state.bpm = Math.min(Math.max(newBPM, 1), 573);
    state.rate = Math.min(Math.max(newRate, 0.9), 1.1);
    text.text =
      "BPM = " + state.bpm.toFixed(2) + (state.rate !== 1 ? " * " + state.rate.toFixed(2) : "");
    console.log(`bpm = ${state.bpm}, rate = ${state.rate}, actualBPM = ${state.bpm * state.rate}`);
  }

  update(state.bpm, state.rate);

  effects.add(() => {
    let buffer: number[] = [];
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "ArrowUp":
          if (event.altKey) {
            update(state.bpm, state.rate + 0.01);
          } else {
            update(state.bpm + (event.shiftKey ? 1 : 0.01), state.rate);
          }
          break;
        case "ArrowDown":
          if (event.altKey) {
            update(state.bpm, state.rate - 0.01);
          } else {
            update(state.bpm - (event.shiftKey ? 1 : 0.01), state.rate);
          }
          break;
        case " ": {
          const now = performance.now();
          const last = buffer.at(-1);
          if (last !== undefined && now - last >= 1250) {
            buffer = [];
          }
          buffer.push(now);
          if (buffer.length >= 8) {
            let sumIntervals = 0;
            for (let i = 0; i < buffer.length - 1; i++) {
              sumIntervals += buffer[i + 1] - buffer[i];
            }
            const avgInterval = sumIntervals / (buffer.length - 1);
            const newBPM = (60 * 1000) / avgInterval;
            update(newBPM, state.rate);
          }
          break;
        }
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
      state.clockMS += ticker.deltaMS;
      const actualBPM = state.bpm * state.rate;
      const beatIntervalMS = (60 * 1000) / actualBPM;
      if (state.clockMS >= state.lastBeatMS + beatIntervalMS) {
        state.lastBeatMS += beatIntervalMS;
        emitter.emit("beat");
      }
    };
    app.ticker.add(callback);
    return () => {
      app.ticker.remove(callback);
    };
  });

  return [];
};
