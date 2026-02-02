import type { Application, Container, EventEmitter, Filter } from "pixi.js";

export type AnyState = Record<string | number | symbol, unknown>;

export type Layer<State extends AnyState = {}> = {
  (context: Context<State>): AnyLayer[] | Promise<AnyLayer[]>;
  id?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLayer = Layer<any>;

export type Context<State extends AnyState = {}> = Readonly<{
  app: Application;
  emitter: EventEmitter;
  state: Partial<State>;
  container: Container;
  filters: FilterList;
  effects: EffectSet;
  signal: AbortSignal;
}>;

export interface FilterList {
  append(filter: Filter): void;
  remove(filter: Filter): void;
}

export type Effect = () => () => void;

export interface EffectSet {
  add(effect: Effect): void;
}
