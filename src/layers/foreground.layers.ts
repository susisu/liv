import type { Layer } from "../types";
import { Example1 } from "./examples.layers";
import { Slides } from "./slides.layers";

export const Foreground: Layer = () => {
  return [Slides, Example1];
};
