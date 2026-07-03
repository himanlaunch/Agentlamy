import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectFramework, findOutputDir } from '../src/detector.js';
import { join } from 'node:path';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

describe('detector', () => {
  it('should detect a directory with index.html as a built site', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aeo-test-'));
    await writeFile(join(dir, 'index.html'), '<html></html>');

    try {
      const result = await findOutputDir(dir);
      assert.equal(result.dir, dir);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('should detect Next.js by config file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aeo-test-'));
    await writeFile(join(dir, 'next.config.js'), 'module.exports = {}');
    await mkdir(join(dir, 'out'));
    await writeFile(join(dir, 'out', 'index.html'), '<html></html>');

    try {
      const result = await detectFramework(dir);
      assert.equal(result.name, 'Next.js');
      assert.ok(result.outputDir.endsWith('out'));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('should detect Eleventy by config file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aeo-test-'));
    await writeFile(join(dir, '.eleventy.js'), 'module.exports = {}');
    await mkdir(join(dir, '_site'));
    await writeFile(join(dir, '_site', 'index.html'), '<html></html>');

    try {
      const result = await detectFramework(dir);
      assert.equal(result.name, 'Eleventy');
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('should detect Docusaurus by config file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aeo-test-'));
    await writeFile(join(dir, 'docusaurus.config.js'), 'module.exports = {}');

    try {
      const result = await detectFramework(dir);
      assert.equal(result.name, 'Docusaurus');
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('should return null for unknown framework', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aeo-test-'));

    try {
      const result = await detectFramework(dir);
      assert.equal(result, null);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('should fall back to common output directories', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aeo-test-'));
    await mkdir(join(dir, 'build'));
    await writeFile(join(dir, 'build', 'index.html'), '<html></html>');

    try {
      const result = await findOutputDir(dir);
      assert.ok(result.dir.endsWith('build'));
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
