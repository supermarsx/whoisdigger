# Contributing

Thank you for taking the time to contribute to Whoisdigger.

## Reviewing update pull requests

Dependabot or other automated tools may open pull requests to update project dependencies. When reviewing these PRs:

1. Ensure the continuous integration checks succeed.
2. Run the tests locally to verify nothing breaks:
   ```bash
   npm install
   npm test
   ```
3. Check the changelog or release notes of updated packages for breaking changes.

If the tests pass and no breaking changes are found, the update can be merged.

## Automatic formatting

A pre-commit hook, managed by `simple-git-hooks`, runs `npm run format` to automatically format staged files. You can also run the formatter manually:

```bash
npm run format
```

To verify formatting in CI or a pre-commit hook, use:

```bash
npm run format:check
```
