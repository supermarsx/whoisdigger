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
