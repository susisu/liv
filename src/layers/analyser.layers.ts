import type { TickerCallback } from "pixi.js";
import { Graphics, GraphicsContext } from "pixi.js";
import type { Layer } from "../types";
import { asyncInit } from "./utils";

export const Analyser: Layer<{
  audio: {
    stream: MediaStream;
    audioContext: AudioContext;
    source: MediaStreamAudioSourceNode;
    analyser: AnalyserNode;
  };
  freqData: Uint8Array<ArrayBuffer>;
  centerX: number;
}> = async ({ app, emitter, state, container, effects }) => {
  await asyncInit(state, async (state) => {
    // eslint-disable-next-line require-atomic-updates
    state.audio ??= await (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0;
      analyser.minDecibels = -100;
      analyser.maxDecibels = 0;
      source.connect(analyser);
      return {
        stream,
        audioContext,
        source,
        analyser,
      };
    })();
    state.freqData ??= new Uint8Array(state.audio.analyser.frequencyBinCount);
    state.centerX ??= app.screen.width / 2;
  });

  const barWidth = app.screen.width / state.freqData.length;
  const barHeight = app.screen.height / 2;
  const context = new GraphicsContext().rect(0, 0, barWidth, barHeight).fill("#ffffff");
  const bars = Array.from({ length: state.freqData.length }).map((_, i) => {
    const bar = new Graphics(context);
    bar.pivot.set(barWidth / 2, 0);
    bar.x = state.centerX + (i % 2 === 0 ? (i / 2) * barWidth : -((i + 1) / 2) * barWidth);
    bar.y = app.screen.height / 2;
    bar.alpha = 0.5;
    return bar;
  });
  for (const bar of bars) {
    container.addChild(bar);
  }

  effects.add(() => {
    const callback: TickerCallback<unknown> = () => {
      state.audio.analyser.getByteFrequencyData(state.freqData);
      for (let i = 0; i < state.freqData.length; i++) {
        const level = state.freqData[i] / 256;
        bars[i].scale.set(1, level);
      }
    };
    app.ticker.add(callback);
    return () => {
      app.ticker.remove(callback);
    };
  });

  effects.add(() => {
    const callback = (x: number): void => {
      state.centerX = x;
      for (let i = 0; i < bars.length; i++) {
        bars[i].x = state.centerX + (i % 2 === 0 ? (i / 2) * barWidth : -((i + 1) / 2) * barWidth);
      }
    };
    emitter.on("moveCharacter", callback);
    return () => {
      emitter.off("moveCharacter", callback);
    };
  });

  return [];
};
