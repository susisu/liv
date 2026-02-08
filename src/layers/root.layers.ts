import type { Layer } from "../types";
import { Background } from "./background.layers";

export const Root: Layer = () => {
  return [Background];
};
