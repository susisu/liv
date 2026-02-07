import type { Application, Container, EventEmitter, Filter } from "pixi.js";

export type AnyState = Record<string | number | symbol, unknown>;

export type Layer<State extends AnyState = {}> = {
  (context: Context<State>): LayerRetrunValue[] | Promise<LayerRetrunValue[]>;
  id?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLayer = Layer<any>;

export type LayerRetrunValue = AnyLayer | boolean | undefined | null;

export type Context<State extends AnyState = {}> = Readonly<{
  app: Application;
  emitter: EventEmitter;
  state: State;
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
