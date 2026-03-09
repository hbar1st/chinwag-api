import js from "@eslint/js";
import globals from "globals";
import promise from "eslint-plugin-promise";


export default [
  // 1. Inherit the recommended JavaScript rules
  js.configs.recommended,

  {
    plugins: {
      promise: {
        rules: promise.rules,
      },
    },

    // 2. Target your backend files
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      // CHANGE: Use node instead of browser
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // 3. Add backend-specific preferences
      "no-console": "warn", // servers need debug logs
      "no-unused-vars": "error", // Keeps your API clean
      "prefer-const": "error", // Encourages immutable data patterns
      "promise/prefer-await-to-then": "error",
    },
  },

  // 4. Global ignores for the backend
  {
    ignores: ["node_modules/", "dist/", "coverage/", ".env"],
  },
];