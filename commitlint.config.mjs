/**
 * Conventional Commits, enforced at commit time by .husky/commit-msg and on
 * pull request titles by .github/workflows/pr-guard.yml.
 */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Match the branch-name types the PR guard accepts, so a branch and its
    // commits can never disagree about what kind of change this is.
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "chore",
        "refactor",
        "docs",
        "test",
        "perf",
        "ci",
        "build",
        "style",
        "revert",
      ],
    ],
    // Commit bodies wrap at 72; the trailer Claude Code appends is longer.
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
};

export default config;
