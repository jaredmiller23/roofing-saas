import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
      // One-time scripts and archived code
      "scripts/**",
      // Test files
      "e2e/**",
      "**/*.spec.ts",
      "**/*.test.ts",
      "playwright-report/**",
      "test-results/**",
      // 3rd party type definitions
      "types/intuit-oauth.d.ts",
      "types/next-pwa.d.ts",
    ],
  },
  {
    rules: {
      // Downgrade code quality issues to warnings (don't block builds)
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "react/no-unescaped-entities": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
      "prefer-const": "warn",
      "react/jsx-no-undef": "error", // Keep this as error - missing imports
    },
  },
];

export default eslintConfig;
