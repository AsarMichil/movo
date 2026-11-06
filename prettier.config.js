/** @type {import("prettier").Config} */
export default {
  semi: false,
  plugins: ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/app.css",
  overrides: [{ files: "*.svelte", options: { parser: "svelte" } }],
}
