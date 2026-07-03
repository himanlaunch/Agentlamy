# Contributing to agentic-seo

Thanks for your interest in contributing to `agentic-seo`! This guide covers how to get started.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/addyosmani/agentic-seo.git
cd agentic-seo

# Install dependencies
npm install

# Run the tests
npm test

# Run against the test fixtures
node bin/aeo.js test/fixtures/good-site
node bin/aeo.js test/fixtures/bad-site
```

## Project Structure

```
agentic-seo/
├── bin/aeo.js              CLI entry point
├── src/
│   ├── index.js            Programmatic API
│   ├── cli.js              CLI argument parsing
│   ├── runner.js            Checker orchestration
│   ├── reporter.js          Terminal + JSON output
│   ├── detector.js          Framework auto-detection
│   ├── tokenizer.js         Token counting
│   ├── scaffolder.js        Init command templates
│   ├── utils.js             Shared utilities
│   └── checkers/            Individual check modules
│       ├── index.js         Checker registry
│       ├── robots-txt.js
│       ├── llms-txt.js
│       └── ...
├── test/
│   ├── fixtures/            Test sites (good-site, bad-site)
│   ├── checkers/            Per-checker tests
│   └── *.test.js            Integration tests
└── docs/                    Documentation
```

## Adding a New Checker

Each checker is a self-contained module in `src/checkers/`. To add one:

1. Create `src/checkers/your-checker.js`:

```js
import { finding, checkerResult } from '../utils.js';

const ID = 'your-checker';
const NAME = 'Your Checker Name';
const CATEGORY = 'discovery'; // or content-structure, token-economics, etc.
const MAX_SCORE = 10;

export async function check(context) {
  const findings = [];
  let score = 0;

  // context.dir - build output directory
  // context.projectDir - project root
  // context.url - live URL (if --serve or --url)
  // context.config - user configuration

  // ... your check logic ...

  // Use finding() helper for consistent output:
  // finding('error', 'What went wrong', 'How to fix it')
  // finding('warning', 'Something to improve', 'Suggestion')
  // finding('info', 'Informational note')

  const status = score >= 8 ? 'pass' : score >= 5 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
```

2. Register it in `src/checkers/index.js`:

```js
import * as yourChecker from './your-checker.js';

export const checkers = [
  // ...existing checkers
  yourChecker,
];
```

3. Update the category `maxScore` in `src/checkers/index.js` if needed.

4. Add tests in `test/checkers/your-checker.test.js`.

5. Add relevant fixtures to `test/fixtures/good-site/` and `test/fixtures/bad-site/`.

## Checker Design Principles

- **No API keys required.** All checks must be heuristic or structural.
- **Actionable fixes.** Every error and warning should include a `fix` suggestion.
- **Consistent scoring.** Use the `checkerResult()` helper for uniform output.
- **Graceful degradation.** Handle missing files, empty directories, and parse errors.
- **Reasonable defaults.** Checkers should work without any user configuration.

## Testing

Tests use Node.js built-in test runner (`node:test`):

```bash
# Run all tests
npm test

# Run a specific test
node --test test/checkers/robots-txt.test.js

# Run with verbose output
npm run test:ci
```

Conventions:
- Test both good-site (should pass) and bad-site (should fail) fixtures
- Test edge cases (empty dirs, missing files, malformed content)
- Every checker should have its own test file

## Code Style

- ESM modules (no CommonJS)
- Node.js >= 18
- No TypeScript (keep it simple and accessible)
- Use `node:` prefix for built-in modules
- Prefer built-in `node:test` and `node:assert` over external test frameworks

## Submitting Changes

1. Fork the repo and create a feature branch
2. Make your changes
3. Add or update tests
4. Run `npm test` and ensure all tests pass
5. Submit a pull request with a clear description

## Reporting Issues

When filing an issue, include:
- Node.js version (`node --version`)
- OS and version
- The command you ran
- The output or error you received
- If possible, a minimal reproduction (directory structure or URL)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
