import { GraphicsContext } from "pixi.js";

export const unit = 32;

export const sprites = {
  right: {
    neutral: new GraphicsContext()
      .rect(0, 0, unit * 8, unit * 8)
      .fill("#ff0000")
      .rect(0, 0, unit, unit)
      .rect(unit * 4, unit * 3, unit, unit * 2)
      .rect(unit * 6, unit * 3, unit, unit * 2)
      .cut(),
    up: new GraphicsContext()
      .rect(0, 0, unit * 8, unit * 8)
      .fill("#ff0000")
      .rect(0, 0, unit, unit)
      .rect(unit * 4, unit * 2, unit, unit * 2)
      .rect(unit * 6, unit * 2, unit, unit * 2)
      .cut(),
    down: new GraphicsContext()
      .rect(0, 0, unit * 8, unit * 8)
      .fill("#ff0000")
      .rect(0, 0, unit, unit)
      .rect(unit * 4, unit * 4, unit, unit * 2)
      .rect(unit * 6, unit * 4, unit, unit * 2)
      .cut(),
  },
  left: {
    neutral: new GraphicsContext()
      .rect(0, 0, unit * 8, unit * 8)
      .fill("#ff0000")
      .rect(unit * 7, 0, unit, unit)
      .rect(unit * 4, unit * 3, unit, unit * 2)
      .rect(unit * 2, unit * 3, unit, unit * 2)
      .cut(),
    up: new GraphicsContext()
      .rect(0, 0, unit * 8, unit * 8)
      .fill("#ff0000")
      .rect(unit * 7, 0, unit, unit)
      .rect(unit * 4, unit * 2, unit, unit * 2)
      .rect(unit * 2, unit * 2, unit, unit * 2)
      .cut(),
    down: new GraphicsContext()
      .rect(0, 0, unit * 8, unit * 8)
      .fill("#ff0000")
      .rect(unit * 7, 0, unit, unit)
      .rect(unit * 4, unit * 4, unit, unit * 2)
      .rect(unit * 2, unit * 4, unit, unit * 2)
      .cut(),
  },
};
