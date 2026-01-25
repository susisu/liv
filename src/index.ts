import { Application } from "pixi.js";

async function main(): Promise<void> {
  const app = new Application();
  await app.init({ background: "#000000", resizeTo: window });
  document.body.appendChild(app.canvas);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
