import { Application } from "pixi.js";
import { Runtime } from "./runtime";
import { Root } from "./root";

async function main(): Promise<void> {
  const app = new Application();
  await app.init({ background: "#000000", resizeTo: window });
  document.body.appendChild(app.canvas);

  const runtime = new Runtime({ app });
  const { container } = runtime.render(Root);
  app.stage.addChild(container);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
