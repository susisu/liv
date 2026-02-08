import type { Texture, TickerCallback } from "pixi.js";
import { Assets, Particle, ParticleContainer } from "pixi.js";
import type { Layer } from "../types";
import { globalScale } from "./config";
import { init } from "./utils";

const margin = 128;

export const Particles: Layer<{
  particles: Particle[];
  theta: number;
  hue: number;
  visible: boolean;
}> = async ({ app, state, container, effects }) => {
  init(state, (state) => {
    state.particles ??= [];
    state.theta ??= 0;
    state.hue ??= 0;
    state.visible ??= false;
  });

  const texture = await Assets.load<Texture>("/assets/square.png");

  if (state.particles.length === 0) {
    const nx = 8;
    const ny = 4;
    for (let i = 0; i < ny; i++) {
      for (let j = 0; j < nx; j++) {
        const x = ((app.screen.width + margin * 2) / nx) * j;
        const y =
          ((app.screen.height + margin * 2) / nx) * j + ((app.screen.height + margin * 2) / ny) * i;
        const particle = new Particle({
          texture,
          x,
          y,
          scaleX: 0.25 * globalScale,
          scaleY: 0.25 * globalScale,
          tint: { h: 0, s: 100, l: 75 },
        });
        state.particles.push(particle);
      }
    }
  }

  const particleContainer = new ParticleContainer({
    dynamicProperties: {
      position: true,
      color: true,
    },
  });
  particleContainer.x = -margin;
  particleContainer.y = -margin;
  particleContainer.alpha = 0.75;
  particleContainer.visible = state.visible;
  for (const particle of state.particles) {
    particleContainer.addParticle(particle);
  }
  container.addChild(particleContainer);

  effects.add(() => {
    const callback = (event: KeyboardEvent): void => {
      switch (event.key) {
        case "l":
          state.visible = !state.visible;
          particleContainer.visible = state.visible;
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
      state.theta += 2 * Math.PI * (ticker.deltaMS / 30_000);
      if (state.theta > 2 * Math.PI) {
        state.theta -= 2 * Math.PI;
      }
      state.hue += 360 * (ticker.deltaMS / 60_000);
      if (state.hue > 360) {
        state.hue -= 360;
      }

      const angle = (Math.sin(state.theta) * Math.PI) / 6;
      const v = 3 * globalScale;
      const vx = v * Math.cos(angle);
      const vy = v * Math.sin(angle);
      for (const particle of state.particles) {
        particle.x += vx;
        particle.y += vy;
        if (particle.x < 0) {
          particle.x += app.screen.width + margin * 2;
        } else if (particle.x > app.screen.width + margin * 2) {
          particle.x -= app.screen.width + margin * 2;
        }
        if (particle.y < 0) {
          particle.y += app.screen.height + margin * 2;
        } else if (particle.y > app.screen.height + margin * 2) {
          particle.y -= app.screen.height + margin * 2;
        }
        particle.tint = { h: state.hue, s: 100, l: 75 };
      }
    };
    app.ticker.add(callback);
    return () => {
      app.ticker.remove(callback);
    };
  });

  return [];
};
