import * as robotsTxt from './robots-txt.js';
import * as llmsTxt from './llms-txt.js';
import * as agentsMd from './agents-md.js';
import * as tokenBudget from './token-budget.js';
import * as contentStructure from './content-structure.js';
import * as markdownAvailability from './markdown-availability.js';
import * as metaTags from './meta-tags.js';
import * as skillMd from './skill-md.js';
import * as agentPermissions from './agent-permissions.js';
import * as copyForAi from './copy-for-ai.js';
import * as sitemapDiscovery from './sitemap-discovery.js';
import * as machineInterfaceCoverage from './machine-interface-coverage.js';
import * as pageIntroQuality from './page-intro-quality.js';
import * as crawlDepthSummary from './crawl-depth-summary.js';

/**
 * All available checkers, ordered by category and priority.
 */
export const checkers = [
  // Discovery
  robotsTxt,
  llmsTxt,
  agentsMd,
  sitemapDiscovery,

  // Content Structure
  contentStructure,
  markdownAvailability,
  pageIntroQuality,
  crawlDepthSummary,

  // Token Economics
  tokenBudget,
  metaTags,

  // Capability Signaling
  skillMd,
  agentPermissions,
  machineInterfaceCoverage,

  // UX Bridge
  copyForAi,
];

/**
 * Category definitions with max scores and descriptions.
 */
export const categories = {
  discovery: {
    name: 'Discovery',
    description: 'Can agents find your documentation?',
    maxScore: 32,
  },
  'content-structure': {
    name: 'Content Structure',
    description: 'Is content machine-readable and well-organized?',
    maxScore: 35,
  },
  'token-economics': {
    name: 'Token Economics',
    description: 'Does content fit within agent context windows?',
    maxScore: 25,
  },
  'capability-signaling': {
    name: 'Capability Signaling',
    description: 'Can agents understand what your APIs do?',
    maxScore: 23,
  },
  'ux-bridge': {
    name: 'UX Bridge',
    description: 'Does the UX support human-agent workflows?',
    maxScore: 10,
  },
};

/**
 * Get a checker by ID.
 */
export function getChecker(id) {
  return checkers.find((c) => c.meta.id === id);
}

/**
 * Get all checkers for a category.
 */
export function getCheckersByCategory(category) {
  return checkers.filter((c) => c.meta.category === category);
}
