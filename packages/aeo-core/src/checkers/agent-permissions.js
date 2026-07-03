import { join } from 'node:path';
import { readFileSafe, resolveFile, finding, checkerResult } from '../utils.js';

const ID = 'agent-permissions';
const NAME = 'Agent Permissions Configuration';
const CATEGORY = 'capability-signaling';
const MAX_SCORE = 5;

/**
 * Check for agent-permissions.json or similar agent access control files.
 *
 * Scoring:
 * - File exists: +2
 * - Has valid JSON structure: +1
 * - Defines allowed interactions: +1
 * - Defines rate limits or constraints: +1
 */
export async function check(context) {
  const findings_list = [];
  let score = 0;

  const filenames = [
    'agent-permissions.json',
    '.well-known/agent-permissions.json',
    'agent.json',
    '.well-known/ai-plugin.json',
  ];

  let content = null;
  let foundPath = null;

  for (const filename of filenames) {
    const result = await resolveFile(context, filename);
    if (result.content) {
      content = result.content;
      foundPath = result.source === 'url' ? `${context.url}/${filename}` : filename;
      break;
    }
  }

  if (!content) {
    findings_list.push(
      finding('info', 'No agent-permissions.json found.',
        'Consider creating an agent-permissions.json to define access rules for automated clients.\nThis emerging standard lets you specify allowed interactions, rate limits, and human-in-the-loop requirements.')
    );
    // Not a hard fail - this is still an emerging standard
    return checkerResult(ID, NAME, CATEGORY, 1, MAX_SCORE, 'warn', findings_list);
  }

  // File exists
  score += 2;
  findings_list.push(finding('info', `Agent permissions file found at ${foundPath}.`));

  // Validate JSON
  let parsed;
  try {
    parsed = JSON.parse(content);
    score += 1;
    findings_list.push(finding('info', 'Valid JSON structure.'));
  } catch (e) {
    findings_list.push(
      finding('error', `Invalid JSON in permissions file: ${e.message}`,
        'Fix the JSON syntax in your agent permissions file.')
    );
    return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, 'fail', findings_list);
  }

  // Check for allowed interactions
  const hasInteractions = parsed.interactions || parsed.allowed || parsed.permissions || parsed.api;
  if (hasInteractions) {
    score += 1;
    findings_list.push(finding('info', 'Defines allowed interactions or permissions.'));
  } else {
    findings_list.push(
      finding('warning', 'No interaction rules defined.',
        'Add an "interactions" or "permissions" field specifying what agents are allowed to do.')
    );
  }

  // Check for rate limits
  const hasRateLimits = parsed.rateLimits || parsed.rate_limits || parsed.throttle || parsed.limits;
  if (hasRateLimits) {
    score += 1;
    findings_list.push(finding('info', 'Includes rate limit configuration.'));
  } else {
    findings_list.push(
      finding('info', 'Consider adding rate limit information for agent consumers.')
    );
  }

  const status = score >= 4 ? 'pass' : score >= 2 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings_list);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
