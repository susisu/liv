import { defineConfig } from "vite";
import * as fs from "node:fs";

function wrap(code: string, id: string): string {
  return `${code}

import { importModule, registerLayers, performRefresh } from "liv:refresh";

if (import.meta.hot) {
  importModule(import.meta.url).then((module) => {
    registerLayers(${JSON.stringify(id)}, module);
    import.meta.hot.accept((newModule) => {
      if (!newModule) {
        return;
      }
      registerLayers(${JSON.stringify(id)}, newModule);
      if (!performRefresh(module, newModule)) {
        import.meta.hot.invalidate();
      }
    });
  });
}
`;
}

export default defineConfig({
  server: {
    proxy: {
      "/profile-image": {
        target: "https://cdn.profile-image.st-hatena.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/profile-image/u, ""),
      },
    },
  },
  plugins: [
    {
      name: "liv",
      resolveId: {
        filter: {
          id: /^liv:refresh$/u,
        },
        handler(id) {
          if (id === "liv:refresh") {
            return id;
          }
          return null;
        },
      },
      load: {
        filter: {
          id: /^liv:refresh$/u,
        },
        handler(id) {
          if (id === "liv:refresh") {
            return fs.readFileSync("./src/refresh.js", "utf-8");
          }
          return null;
        },
      },
      transform: {
        filter: {
          id: /\.layers\.(js|ts)$/u,
        },
        handler(code, id) {
          return {
            code: wrap(code, id),
            map: null,
          };
        },
      },
    },
  ],
});
