import type { Application, Container } from "pixi.js";

export type Layer<State extends Record<string, unknown> = {}> = {
  (context: Context<State>): AnyLayer[] | Promise<AnyLayer[]>;
  id?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLayer = Layer<any>;

export type Context<State extends Record<string, unknown> = {}> = Readonly<{
  app: Application;
  state: Partial<State>;
  container: Container;
  cleanups: Array<() => void>;
}>;
