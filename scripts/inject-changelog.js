#!/usr/bin/env node

/**
 * Injects the 5 most recent changelog entries into README.md
 * under a "## What's New" heading at the bottom.
 *
 * Run automatically as part of `npm run build`.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHANGELOG_PATH = join(ROOT, 'src', 'data', 'changelog.json');
const README_PATH = join(ROOT, 'README.md');

const MARKER_START = '<!-- CHANGELOG:START -->';
const MARKER_END = '<!-- CHANGELOG:END -->';

function main() {
  let changelog;
  try {
    changelog = JSON.parse(readFileSync(CHANGELOG_PATH, 'utf-8'));
  } catch {
    console.log('No changelog.json found, skipping README injection.');
    return;
  }

  const recent = changelog.slice(0, 5);
  if (recent.length === 0) return;

  // Build markdown
  let md = `\n## What's New\n\n`;
  for (const entry of recent) {
    md += `### ${entry.version} — ${entry.date}\n`;
    md += `${entry.summary}\n`;
    for (const change of entry.changes) {
      md += `- ${change}\n`;
    }
    md += '\n';
  }

  const block = `${MARKER_START}\n${md.trim()}\n${MARKER_END}`;

  let readme = readFileSync(README_PATH, 'utf-8');

  // Replace existing block or append before the final line
  const markerRegex = new RegExp(`${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}`);
  if (markerRegex.test(readme)) {
    readme = readme.replace(markerRegex, block);
  } else {
    // Insert before the last horizontal rule + tagline, or at the end
    const lastHr = readme.lastIndexOf('\n---\n');
    if (lastHr > 0) {
      readme = readme.slice(0, lastHr) + '\n' + block + '\n' + readme.slice(lastHr);
    } else {
      readme += '\n\n' + block + '\n';
    }
  }

  writeFileSync(README_PATH, readme);
  console.log(`Injected ${recent.length} changelog entries into README.md`);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();
