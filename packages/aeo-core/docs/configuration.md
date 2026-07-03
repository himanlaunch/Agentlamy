# Configuration

`agentic-seo` works with zero configuration out of the box. For customization, create a config file.

## Config File Locations

Configuration is loaded from (in priority order):

1. `.aeorc.json` in the project root
2. `"aeo"` key in `package.json`

## Options

### `outputDir`

Explicitly set the build output directory instead of auto-detecting.

```json
{
  "outputDir": "_site"
}
```

### `checks`

Per-checker configuration overrides.

```json
{
  "checks": {
    "token-budget": {
      "maxTokensPerPage": 25000
    },
    "robots-txt": {
      "requiredAgents": ["ClaudeBot", "GPTBot", "PerplexityBot"]
    }
  }
}
```

### `ignore`

Glob patterns for files/directories to ignore during scanning.

```json
{
  "ignore": ["**/node_modules/**", "**/vendor/**", "**/assets/**"]
}
```

### `threshold`

Minimum score percentage. When set, the CLI exits with code 1 if the score is below this threshold. Useful for CI.

```json
{
  "threshold": 60
}
```

## Framework Auto-Detection

`agentic-seo` detects your framework by looking for config files:

| Framework | Config File | Default Output |
|---|---|---|
| Next.js | `next.config.js/mjs/ts` | `out`, `.next` |
| Docusaurus | `docusaurus.config.js/ts` | `build` |
| Eleventy | `.eleventy.js`, `eleventy.config.*` | `_site` |
| Astro | `astro.config.mjs/js/ts` | `dist` |
| Hugo | `hugo.toml/yaml/json` | `public` |
| Jekyll | `_config.yml` | `_site` |
| Gatsby | `gatsby-config.js/ts` | `public` |
| VitePress | `.vitepress/config.*` | `.vitepress/dist` |
| MkDocs | `mkdocs.yml` | `site` |
| Sphinx | `conf.py` | `_build/html` |
| Vite | `vite.config.*` | `dist` |

If no framework is detected, the tool checks common output directory names (`_site`, `build`, `dist`, `public`, `out`) or uses the specified directory directly.

## CI Integration

### GitHub Actions

```yaml
- name: AEO Audit
  run: npx agentic-seo --json --threshold 60
```

### With JSON output

```bash
# Parse the JSON output
SCORE=$(npx agentic-seo score --json | jq '.percentage')
echo "AEO Score: $SCORE%"
```

### As a build step

```json
{
  "scripts": {
    "build": "next build && next export",
    "postbuild": "agentic-seo ./out --threshold 50"
  }
}
```

## Environment Variables

Currently none. All configuration is file-based. No API keys are required.
