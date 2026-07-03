import { join } from 'node:path';
import { readFileSafe, resolveFile, finding, checkerResult } from '../utils.js';

const ID = 'agents-md';
const NAME = 'AGENTS.md / CLAUDE.md';
const CATEGORY = 'discovery';
const MAX_SCORE = 5;

const AGENT_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  '.claude/CLAUDE.md',
  'COPILOT.md',
  '.github/AGENTS.md',
];

/**
 * Check for AGENTS.md or equivalent agent instruction files.
 *
 * Scoring:
 * - File exists: +2
 * - Contains project structure info: +1
 * - Contains links to docs/APIs: +1
 * - Contains conventions/patterns: +1
 */
export async function check(context) {
  const findings_list = [];
  let score = 0;

  const searchDir = context.dir ? (context.projectDir || context.dir) : null;
  let content = null;
  let foundFile = null;

  if (searchDir) {
    for (const file of AGENT_FILES) {
      const c = await readFileSafe(join(searchDir, file));
      if (c) {
        content = c;
        foundFile = file;
        break;
      }
    }
  }

  if (!content) {
    for (const file of AGENT_FILES) {
      const result = await resolveFile(context, file);
      if (result.content) {
        content = result.content;
        foundFile = file;
        break;
      }
    }
  }

  if (!content) {
    findings_list.push(
      finding('error', 'No AGENTS.md, CLAUDE.md, or similar agent instruction file found.',
        'Create an AGENTS.md in your repo root. This is the entry point for AI coding agents.\nInclude: project structure, key file locations, API docs links, dev environment setup, and coding conventions.')
    );
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'fail', findings_list);
  }

  // File exists
  score += 2;
  findings_list.push(finding('info', `Found ${foundFile}.`));

  // Check for project structure info
  const hasStructure = /structure|directory|file|folder|layout|architecture/i.test(content);
  if (hasStructure) {
    score += 1;
    findings_list.push(finding('info', 'Contains project structure information.'));
  } else {
    findings_list.push(
      finding('warning', 'Missing project structure information.',
        'Add a section describing key directories and file locations.')
    );
  }

  // Check for links to docs/APIs
  const hasLinks = /https?:\/\/|\/docs|api|documentation|reference/i.test(content);
  if (hasLinks) {
    score += 1;
    findings_list.push(finding('info', 'Contains links to documentation or APIs.'));
  } else {
    findings_list.push(
      finding('warning', 'No links to documentation or API references found.',
        'Add links to relevant API docs, OpenAPI specs, or developer portals.')
    );
  }

  // Check for conventions/patterns
  const hasConventions = /convention|pattern|prefer|style|rule|guideline|standard/i.test(content);
  if (hasConventions) {
    score += 1;
    findings_list.push(finding('info', 'Contains coding conventions or patterns.'));
  } else {
    findings_list.push(
      finding('warning', 'No coding conventions or patterns described.',
        'Add preferred patterns, naming conventions, and coding standards for agents to follow.')
    );
  }

  const status = score >= 4 ? 'pass' : score >= 2 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings_list);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
