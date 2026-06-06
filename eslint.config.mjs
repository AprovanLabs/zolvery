import baseConfig from "@aprovan/eslint-config/base";

export default [
  ...baseConfig,
  {
    name: "zolvery/overrides",
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-member-accessibility": "warn",
    },
  },
  {
    name: "zolvery/ignores",
    ignores: ["docs/**"],
  },
];
