// functions/eslint.config.js

import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    // This config applies to all JavaScript and TypeScript files
    files: ["**/*.{js,mjs,cjs,ts}"],
    // Use the recommended rules from ESLint
    ...pluginJs.configs.recommended,
    languageOptions: {
      // Define the global variables available in the environment
      globals: {
        ...globals.node, // This is the key fix: It defines 'module', 'require', etc.
      },
    },
  },
  {
    // This tells ESLint to ignore the compiled output directory
    ignores: ["lib/"],
  },
];