import type { Application, Container } from "pixi.js";

export type Layer = {
  (context: Context): Layer[] | Promise<Layer[]>;
  id?: string;
};

export type Context = Readonly<{
  app: Application;
  state: Record<string, unknown>;
  container: Container;
  cleanups: Array<() => void>;
}>;
