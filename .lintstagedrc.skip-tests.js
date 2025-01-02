export default {
  "*.{js,ts,svelte}": [
    "eslint --fix",
    "prettier --write",
    "bash -c 'tsc --noEmit --skipLibCheck'",
  ],
  "*.test.{js,ts}": [
    "prettier --write",
    "bash -c 'tsc --noEmit --skipLibCheck'",
  ],
  "*.{json,md,yaml,yml}": ["prettier --write"],
};
