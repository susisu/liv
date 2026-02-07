import { config } from "@susisu/eslint-config";
import globals from "globals";

export default config(
  {
    tsconfigRootDir: import.meta.dirname,
  },
  {
    files: ["src/**/*"],
    languageOptions: {
      globals: {
        ...globals.es2025,
        ...globals.browser,
      },
    },
  },
  {
    files: ["src/layers/**/*"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["*"],
    languageOptions: {
      globals: {
        ...globals.es2025,
        ...globals.node,
      },
    },
  },
);
