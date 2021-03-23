module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json", "./packages/**/tsconfig.json"],
  },
  plugins: ["@typescript-eslint", "promise"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  env: {
    node: true,
  },
  rules: {
    "@typescript-eslint/ban-ts-comment": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "promise/catch-or-return": "warn",
    "@typescript-eslint/no-misused-promises": "warn",
  },
  ignorePatterns: [".eslintrc.js"],
};
