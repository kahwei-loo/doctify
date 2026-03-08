module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs", "coverage", "node_modules"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh"],
  rules: {
    // HMR-only rule — shadcn components legitimately export non-components
    "react-refresh/only-export-components": "off",
    // Unused vars enforced by TypeScript (noUnusedLocals/noUnusedParameters in tsconfig.json)
    "@typescript-eslint/no-unused-vars": "off",
    // Allow any — too noisy for a mixed-type project
    "@typescript-eslint/no-explicit-any": "off",
    // Intentional patterns (mount-only effects, stable API refs) — too risky to auto-fix
    "react-hooks/exhaustive-deps": "off",
    // while (true) with break is valid for stream reading — disable loop check only
    "no-constant-condition": ["error", { checkLoops: false }],
  },
  overrides: [
    {
      // Test files use require() for dynamic mocking patterns
      files: ["tests/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/ban-types": "off",
      },
    },
  ],
};
