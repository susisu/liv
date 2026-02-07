import { Application } from "pixi.js";
import { Renderer } from "./runtime";
import { Root } from "./layers/root.layers";

async function main(): Promise<void> {
  const app = new Application();
  await app.init({ background: "#000000", resizeTo: window });
  document.body.appendChild(app.canvas);

  const renderer = new Renderer({ app });
  renderer.render(Root);
  app.stage.addChild(renderer.container);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
