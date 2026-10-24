const path = require("node:path");
const { createRequire } = require("node:module");

const requireBackend = createRequire(path.join(__dirname, "BACK-END", "package.json"));
const js = requireBackend("@eslint/js");
const globals = requireBackend("globals");

module.exports = [
  {
    ignores: ["BACK-END/node_modules/**", "BACK-END/prisma/**", "BACK-END/certs/**"],
  },
  js.configs.recommended,
  {
    files: ["BACK-END/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  {
    files: ["FRON_END/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
  },
];