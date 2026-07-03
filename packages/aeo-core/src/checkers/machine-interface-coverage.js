import { finding, checkerResult, getResourceFromContext } from '../utils.js';

const ID = 'machine-interface-coverage';
const NAME = 'Machine Interface Coverage';
const CATEGORY = 'capability-signaling';
const MAX_SCORE = 8;

export async function check(context) {
  const findings = [];
  let score = 0;

  const pages = context.pages || [];
  const resources = context.resources || {};
  const pageText = pages.map((page) => `${page.title}\n${page.text.slice(0, 500)}`).join('\n').toLowerCase();

  const signals = {
    openapi: /openapi|swagger/.test(pageText) || Object.keys(resources).some((key) => /openapi|swagger/i.test(key)),
    mcp: /model context protocol|mcp/.test(pageText),
    cli: /cli|command line|npm install|pip install|brew install/.test(pageText),
    skills: /skill\.md|skills/.test(pageText) || Boolean(getResourceFromContext(context, 'skill.md')?.content),
  };

  const present = Object.entries(signals).filter(([, value]) => value).map(([key]) => key);
  score += Math.min(present.length * 2, 8);

  if (present.length > 0) {
    findings.push(finding('info', `Detected machine-oriented interfaces: ${present.join(', ')}.`));
  } else {
    findings.push(
      finding('warning', 'No strong machine-interface signals were detected.',
        'Add explicit references to OpenAPI, MCP, CLI usage, or skill.md so agents can choose the right interface quickly.')
    );
  }

  if (!signals.openapi) {
    findings.push(finding('info', 'OpenAPI or Swagger references were not detected. Consider surfacing an API spec URL if one exists.'));
  }
  if (!signals.mcp) {
    findings.push(finding('info', 'No MCP references found. If your platform exposes an MCP server, link it from the docs and llms.txt.'));
  }

  const status = score >= 6 ? 'pass' : score >= 3 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
