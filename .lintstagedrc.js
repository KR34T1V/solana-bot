export default {
  "*.{js,ts,svelte}": [
    "eslint --fix",
    "prettier --write",
    "bash -c 'tsc --noEmit --skipLibCheck'",
    "bash -c './scripts/test-staged.sh'",
  ],
  "*.test.{js,ts}": [
    "prettier --write",
    "bash -c 'tsc --noEmit --skipLibCheck'",
    "bash -c './scripts/test-staged.sh'",
  ],
  "*.{json,md,yaml,yml}": ["prettier --write"],
};
