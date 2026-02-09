import type { Layer } from "../types";
import { Slides } from "./slides.layers";

export const Foreground: Layer = () => {
  return [Slides];
};
