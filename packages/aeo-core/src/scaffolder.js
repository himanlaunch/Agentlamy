import { join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileExists, readFileSafe } from './utils.js';

const TEMPLATES = {
  'llms.txt': () => `# Project Documentation

> Brief description of your project and what it does.

## Getting Started
- [Quick Start](/docs/quickstart): Install and make your first API call in 5 minutes
- [Authentication](/docs/auth): Authentication methods and API key setup
- [Core Concepts](/docs/concepts): Key terminology and data model overview

## API Reference
- [REST API Overview](/docs/api): Base URLs, versioning, pagination, error codes
- [Users API](/docs/api/users): CRUD operations for user management (12K tokens)
- [Events API](/docs/api/events): Event streaming and webhook configuration (8K tokens)

## Guides
- [Migration Guide](/docs/migration): Upgrading from v1 to v2
- [Best Practices](/docs/best-practices): Performance tips and common patterns
- [Troubleshooting](/docs/troubleshooting): Common issues and solutions
`,

  'AGENTS.md': (projectName) => `# ${projectName || 'Project'} - Agent Instructions

## Project Overview
Brief description of what this project does and its primary purpose.

## Project Structure
\`\`\`
├── src/            # Source code
├── docs/           # Documentation
├── test/           # Test files
└── README.md       # Human-readable overview
\`\`\`

## Key Files
- \`src/index.js\` - Main entry point
- \`docs/api.md\` - API documentation
- \`package.json\` - Dependencies and scripts

## Development
- \`npm install\` - Install dependencies
- \`npm test\` - Run tests
- \`npm run build\` - Build the project

## API Documentation
- REST API: /docs/api
- OpenAPI spec: /docs/openapi.yaml

## Coding Conventions
- Use ESM imports
- Follow existing patterns in the codebase
- Write tests for new functionality

## Constraints
- Node.js >= 18 required
- All PRs must pass CI checks
`,

  'skill.md': (projectName) => `---
name: ${projectName || 'my-service'}
description: Brief description of what this service does
---

## What I can accomplish
- Capability 1: Description of what this can do
- Capability 2: Description of another capability
- Capability 3: And another one

## Required inputs
- API Key: Obtain from the developer console at /settings/api-keys
- Base URL: \`https://api.example.com/v1\`

## Constraints
- Rate limit: 1000 requests per minute
- Max payload size: 10MB
- Authentication: Bearer token required

## Key documentation
- [API Reference](/docs/api): Complete API documentation
- [Quick Start](/docs/quickstart): Get started in 5 minutes
- [Examples](/docs/examples): Code samples and use cases
`,

  'agent-permissions.json': () => JSON.stringify({
    version: '1.0',
    description: 'Agent access permissions for this site',
    interactions: {
      read: {
        allowed: true,
        paths: ['/docs/*', '/api/*'],
      },
      api: {
        allowed: true,
        endpoints: ['/api/v1/*'],
        rateLimit: '100/minute',
      },
    },
    rateLimits: {
      default: '100/minute',
      authenticated: '1000/minute',
    },
    contact: 'devrel@example.com',
  }, null, 2) + '\n',
};

/**
 * Scaffold missing AEO files in the target directory.
 * Returns list of created file paths.
 */
export async function scaffold(dir) {
  await mkdir(dir, { recursive: true });
  const created = [];

  // Try to detect project name from package.json
  let projectName = null;
  const pkgContent = await readFileSafe(join(dir, 'package.json'));
  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent);
      projectName = pkg.name;
    } catch {
      // ignore
    }
  }

  for (const [filename, templateFn] of Object.entries(TEMPLATES)) {
    const filePath = join(dir, filename);
    if (!(await fileExists(filePath))) {
      const content = templateFn(projectName);
      await writeFile(filePath, content, 'utf-8');
      created.push(filename);
    }
  }

  return created;
}
