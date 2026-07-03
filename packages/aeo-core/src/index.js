/**
 * agentic-seo - Programmatic API
 *
 * Usage:
 *   import { audit, auditUrl } from 'agentic-seo';
 *
 *   const report = await audit('./my-site');
 *   console.log(report.grade); // 'B'
 *   console.log(report.percentage); // 78
 */

import { resolve } from 'node:path';
import { crawlSite } from './crawler.js';
import { generateArtifacts } from './remediation.js';
import { generateVisibilityAnalysis } from './visibility-analysis.js';
import { runAudit } from './runner.js';
import { findOutputDir } from './detector.js';
import { createScanContext, loadConfig } from './utils.js';
import { startServer } from './server.js';

export { checkers, categories, getChecker } from './checkers/index.js';
export { countTokens, classifyTokenCount, TOKEN_THRESHOLDS } from './tokenizer.js';
export { detectFramework, findOutputDir } from './detector.js';
export { crawlSite } from './crawler.js';
export { createProvider } from './providers.js';
export { generateArtifacts } from './remediation.js';
export { generateVisibilityAnalysis } from './visibility-analysis.js';

/**
 * Audit a local directory for AEO compliance.
 *
 * @param {string} dir - Path to the site directory
 * @param {object} options - { checks, config }
 * @returns {Promise<object>} Audit report
 */
export async function audit(dir, options = {}) {
  const resolvedDir = resolve(dir);
  const config = { ...await loadConfig(resolvedDir), ...options.config };
  const detection = await findOutputDir(resolvedDir);
  const auditDir = detection.dir || resolvedDir;

  const context = {
    dir: auditDir,
    projectDir: resolvedDir,
    url: null,
    config,
  };

  return runAudit(context, {
    checkerIds: options.checks,
    onProgress: options.onProgress,
  });
}

/**
 * Audit a local directory by spinning up a server first.
 *
 * @param {string} dir - Path to the site directory
 * @param {object} options - { checks, config, port }
 * @returns {Promise<object>} Audit report
 */
export async function auditWithServer(dir, options = {}) {
  const resolvedDir = resolve(dir);
  const config = { ...await loadConfig(resolvedDir), ...options.config };
  const detection = await findOutputDir(resolvedDir);
  const auditDir = detection.dir || resolvedDir;

  const server = await startServer(auditDir, options.port || 0);

  try {
    const context = {
      dir: auditDir,
      projectDir: resolvedDir,
      url: server.url,
      config,
    };

    return await runAudit(context, {
      checkerIds: options.checks,
      onProgress: options.onProgress,
    });
  } finally {
    await server.close();
  }
}

/**
 * Audit a live documentation URL using the hosted crawl pipeline.
 *
 * @param {string} baseUrl
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function auditLiveSite(baseUrl, options = {}) {
  const crawl = await crawlSite(baseUrl, options);
  const context = createScanContext(baseUrl, crawl);
  const report = await runAudit(context, {
    checkerIds: options.checks,
    onProgress: options.onProgress,
  });

  return {
    ...report,
    baseUrl,
    pages: crawl.pages,
    resources: Object.fromEntries(
      Object.entries(crawl.resources).map(([key, value]) => [key, { status: value.status, contentType: value.contentType }])
    ),
    crawlSummary: crawl.summary,
    analyticsGuidance: crawl.analyticsGuidance,
  };
}

/**
 * Audit a live site and draft remediation artifacts.
 *
 * @param {string} baseUrl
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function auditAndGenerate(baseUrl, options = {}) {
  const report = await auditLiveSite(baseUrl, options);
  const remediation = await generateArtifacts({
    report,
    baseUrl,
    providerConfig: options.providerConfig,
  });

  return {
    report,
    remediation,
  };
}
