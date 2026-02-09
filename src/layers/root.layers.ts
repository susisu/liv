import type { Layer } from "../types";
import { Background } from "./background.layers";
import { Foreground } from "./foreground.layers";

export const Root: Layer = () => {
  return [Background, Foreground];
};
