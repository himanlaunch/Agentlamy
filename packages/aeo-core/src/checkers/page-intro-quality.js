import { finding, checkerResult, samplePages } from '../utils.js';

const ID = 'page-intro-quality';
const NAME = 'Page Intro Quality';
const CATEGORY = 'content-structure';
const MAX_SCORE = 5;

export async function check(context) {
  const findings = [];
  const pages = samplePages(context, 20);

  if (pages.length === 0) {
    findings.push(finding('warning', 'No crawled pages available for intro quality analysis.'));
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'warn', findings);
  }

  const strongIntros = pages.filter((page) => page.hasGoodIntro).length;
  const ratio = strongIntros / pages.length;
  let score = 0;

  if (ratio >= 0.7) {
    score = 5;
    findings.push(finding('info', `${strongIntros} of ${pages.length} sampled pages front-load a clear outcome-oriented intro.`));
  } else if (ratio >= 0.4) {
    score = 3;
    findings.push(
      finding('warning', `Only ${strongIntros} of ${pages.length} sampled pages have strong opening paragraphs.`,
        'Open each page with what it covers, what the agent can accomplish, and any required setup.')
    );
  } else {
    findings.push(
      finding('error', `Most sampled pages lack a strong opening paragraph (${strongIntros}/${pages.length}).`,
        'Move background material below a concise task-focused intro in the first 200 words.')
    );
  }

  const status = score >= 4 ? 'pass' : score >= 2 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
