/**
 * ESLint для кода системы, тестов и скриптов (npm run lint).
 * Ловит необъявленные переменные, опечатки в именах и неиспользуемый код
 * до того, как система попадёт в Foundry.
 */
import js from "@eslint/js";
import globals from "globals";

/** Глобальные объекты Foundry VTT v13, которыми пользуется система. */
const foundryGlobals = Object.fromEntries([
  "foundry", "game", "CONFIG", "CONST", "Hooks", "ui", "canvas",
  "ChatMessage", "Roll", "Macro", "Actor", "Item", "fromUuid", "fromUuidSync"
].map(name => [name, "readonly"]));

export default [
  { ignores: ["node_modules/**"] },
  js.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-var": "error"
    }
  },
  {
    files: ["module/**/*.mjs"],
    languageOptions: { globals: { ...globals.browser, ...foundryGlobals } }
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.mjs"],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    // Тесты подменяют Foundry заглушками в глобальной области (tests/helpers/foundry.mjs).
    files: ["tests/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...foundryGlobals } }
  }
];
