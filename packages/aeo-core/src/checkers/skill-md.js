import { basename } from 'node:path';
import { readFileSafe, walkDir, relativePath, finding, checkerResult, resolveFile } from '../utils.js';
import matter from 'gray-matter';

const ID = 'skill-md';
const NAME = 'Capability Signaling (skill.md)';
const CATEGORY = 'capability-signaling';
const MAX_SCORE = 10;

/**
 * Check for skill.md files that describe API/service capabilities.
 *
 * Scoring:
 * - At least one skill.md exists: +3
 * - Has frontmatter with name and description: +2
 * - Describes capabilities: +2
 * - Describes required inputs: +1
 * - Describes constraints: +1
 * - Links to documentation: +1
 */
export async function check(context) {
  const findings_list = [];
  let score = 0;

  // In URL-only mode (no local dir), we can't scan for skill files
  const searchDir = context.dir ? (context.projectDir || context.dir) : null;
  let skillFiles = [];

  if (searchDir) {
    const mdFiles = await walkDir(searchDir, ['.md']);
    skillFiles = mdFiles.filter((f) => {
      const name = basename(f).toLowerCase();
      return name === 'skill.md' || name === 'skills.md' || name.startsWith('skill-');
    });
  }

  if (skillFiles.length === 0) {
    const urlCandidates = ['skill.md', 'skills.md', '.well-known/skill.md'];
    for (const candidate of urlCandidates) {
      const result = await resolveFile(context, candidate);
      if (result.content) {
        skillFiles.push(candidate);
      }
    }
  }

  if (skillFiles.length === 0) {
    const msg = searchDir
      ? 'No skill.md files found.'
      : 'Cannot scan for skill.md files in URL-only mode.';
    findings_list.push(
      finding('error', msg,
        'Create skill.md files for your APIs and services. These tell agents what your product can DO, not just how to call it.\nInclude: capabilities list, required inputs, constraints, and links to detailed docs.')
    );
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'fail', findings_list);
  }

  // At least one exists
  score += 3;
  findings_list.push(finding('info', `Found ${skillFiles.length} skill file(s): ${skillFiles.map((f) => relativePath(searchDir, f)).join(', ')}`));

  // Analyze the first (or best) skill file
  let bestScore = 0;
  let bestFindings = [];

  for (const file of skillFiles) {
    const content = searchDir ? await readFileSafe(file) : (await resolveFile(context, file)).content;
    if (!content) continue;

    let fileScore = 0;
    const fileFindings = [];
    const relPath = searchDir ? relativePath(searchDir, file) : file;

    // Check frontmatter
    try {
      const { data, content: body } = matter(content);

      if (data.name && data.description) {
        fileScore += 2;
        fileFindings.push(finding('info', `${relPath}: Has proper frontmatter (name: "${data.name}").`));
      } else {
        fileFindings.push(
          finding('warning', `${relPath}: Missing name or description in frontmatter.`,
            'Add YAML frontmatter with name and description fields.')
        );
      }

      const lower = body.toLowerCase();

      // Check capabilities section
      if (/what (i|it|this) can|capabilities|features|abilities/i.test(body)) {
        fileScore += 2;
        fileFindings.push(finding('info', `${relPath}: Describes capabilities.`));
      } else {
        fileFindings.push(
          finding('warning', `${relPath}: No capabilities section found.`,
            'Add a "## What I can accomplish" section listing specific capabilities.')
        );
      }

      // Check required inputs
      if (/required|inputs|prerequisites|parameters|configuration/i.test(body)) {
        fileScore += 1;
        fileFindings.push(finding('info', `${relPath}: Documents required inputs.`));
      } else {
        fileFindings.push(
          finding('warning', `${relPath}: No required inputs section.`,
            'Add a "## Required inputs" section listing what\'s needed to use the service.')
        );
      }

      // Check constraints
      if (/constraints?|limits?|rate.?limit|restriction|expir/i.test(body)) {
        fileScore += 1;
        fileFindings.push(finding('info', `${relPath}: Documents constraints and limits.`));
      } else {
        fileFindings.push(
          finding('warning', `${relPath}: No constraints section.`,
            'Add a "## Constraints" section with rate limits, token expiry, and other limitations.')
        );
      }

      // Check for documentation links
      const hasLinks = /\[.+\]\(.+\)/g.test(body);
      if (hasLinks) {
        fileScore += 1;
        fileFindings.push(finding('info', `${relPath}: Includes documentation links.`));
      } else {
        fileFindings.push(
          finding('warning', `${relPath}: No documentation links found.`,
            'Add links to detailed documentation, API references, and examples.')
        );
      }
    } catch {
      fileFindings.push(finding('warning', `${relPath}: Could not parse frontmatter.`));
    }

    if (fileScore > bestScore) {
      bestScore = fileScore;
      bestFindings = fileFindings;
    }
  }

  score += bestScore;
  findings_list.push(...bestFindings);

  const status = score >= 8 ? 'pass' : score >= 5 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings_list);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
