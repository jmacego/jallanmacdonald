import eslint from "@eslint/js";
import astroPlugin from "eslint-plugin-astro";

export default [
  eslint.configs.recommended,
  ...astroPlugin.configs.recommended,
  {
    ignores: ["dist/", ".astro/", "node_modules/"],
  },
];
