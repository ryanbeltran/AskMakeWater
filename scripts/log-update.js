#!/usr/bin/env node

/**
 * Dev log updater — auto-summarizes code changes into changelog.json
 *
 * Usage: npm run log
 *
 * 1. Reads git diff (staged + unstaged, or last commit if nothing changed)
 * 2. Sends to Claude Haiku for a plain-language summary
 * 3. Prompts for optional version label
 * 4. Prepends entry to src/data/changelog.json
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHANGELOG_PATH = join(ROOT, 'src', 'data', 'changelog.json');

// Load .env.local
try {
  const envFile = readFileSync(join(ROOT, '.env.local'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key && val) process.env[key] = val;
    }
  }
} catch {}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function getDiff({ prePush = false } = {}) {
  // Pre-push mode: diff the commits about to be pushed (ahead of upstream).
  if (prePush) {
    try {
      const diff = execSync('git diff @{u}..HEAD', { cwd: ROOT, encoding: 'utf-8', maxBuffer: 1024 * 1024 });
      return diff.trim();
    } catch {
      return '';
    }
  }

  // Interactive mode: staged + unstaged → staged → last commit
  let diff = '';
  try {
    diff = execSync('git diff HEAD', { cwd: ROOT, encoding: 'utf-8', maxBuffer: 1024 * 1024 });
  } catch {}

  if (!diff.trim()) {
    try {
      diff = execSync('git diff --cached', { cwd: ROOT, encoding: 'utf-8', maxBuffer: 1024 * 1024 });
    } catch {}
  }

  if (!diff.trim()) {
    try {
      diff = execSync('git diff HEAD~1 HEAD', { cwd: ROOT, encoding: 'utf-8', maxBuffer: 1024 * 1024 });
    } catch {}
  }

  return diff.trim();
}

function getLastVersion() {
  try {
    const changelog = JSON.parse(readFileSync(CHANGELOG_PATH, 'utf-8'));
    if (changelog.length > 0 && changelog[0].version) {
      return changelog[0].version;
    }
  } catch {}
  return 'v1.0.0';
}

function incrementVersion(version) {
  const match = version.match(/^v?(\d+)\.(\d+)\.?(\d+)?$/);
  if (!match) return 'v1.0.1';
  const major = parseInt(match[1]);
  const minor = parseInt(match[2]);
  const patch = parseInt(match[3] || '0') + 1;
  return `v${major}.${minor}.${patch}`;
}

async function summarizeWithAI(diff) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY not found in .env.local');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Truncate very large diffs to stay within limits
  const truncatedDiff = diff.length > 15000 ? diff.slice(0, 15000) + '\n\n... (diff truncated)' : diff;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `You are writing a changelog entry for an open-source web app called "ask makewater" (a digital water cost calculator).

Given this git diff, write:
1. A one-sentence summary (plain language, user-facing — not technical jargon)
2. 2-5 bullet points describing what changed (focus on what users will notice, not implementation details)

Respond in this exact JSON format and nothing else:
{"summary": "...", "changes": ["...", "..."]}

Git diff:
\`\`\`
${truncatedDiff}
\`\`\``,
      },
    ],
  });

  const text = response.content[0].text.trim();

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON: ' + text);
  }

  return JSON.parse(jsonMatch[0]);
}

async function main() {
  const nonInteractive = process.argv.includes('--yes') || process.argv.includes('-y');

  if (!nonInteractive) console.log('\n📋 ask makewater — Dev Log Update\n');

  // Get diff
  const diff = getDiff({ prePush: nonInteractive });
  if (!diff) {
    if (!nonInteractive) {
      console.log('No changes found (no diff, no staged changes, no recent commits).');
    }
    process.exit(0);
  }

  if (!nonInteractive) {
    console.log(`Found ${diff.split('\n').length} lines of diff.\n`);
    console.log('Asking Claude to summarize...\n');
  }

  // Summarize with AI
  let result;
  try {
    result = await summarizeWithAI(diff);
  } catch (err) {
    if (nonInteractive) {
      console.error('Changelog auto-update failed:', err.message);
      process.exit(0); // don't block the push on AI failure
    }
    console.error('AI summarization failed:', err.message);
    console.log('\nFalling back to manual entry.\n');
    const summary = await ask('Summary (one sentence): ');
    const changesRaw = await ask('Changes (comma-separated): ');
    result = {
      summary,
      changes: changesRaw.split(',').map(s => s.trim()).filter(Boolean),
    };
  }

  if (!nonInteractive) {
    // Show result
    console.log('─'.repeat(50));
    console.log(`Summary: ${result.summary}`);
    console.log('Changes:');
    result.changes.forEach(c => console.log(`  • ${c}`));
    console.log('─'.repeat(50));

    // Confirm or edit
    const confirm = await ask('\nLooks good? (y to accept, e to edit, n to cancel): ');
    if (confirm.toLowerCase() === 'n') {
      console.log('Cancelled.');
      process.exit(0);
    }

    if (confirm.toLowerCase() === 'e') {
      const newSummary = await ask(`Summary [${result.summary}]: `);
      if (newSummary) result.summary = newSummary;

      console.log('Current changes:');
      result.changes.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
      const newChanges = await ask('New changes (comma-separated, or Enter to keep): ');
      if (newChanges.trim()) {
        result.changes = newChanges.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }

  // Version
  const lastVersion = getLastVersion();
  const defaultVersion = incrementVersion(lastVersion);
  const version = nonInteractive
    ? defaultVersion
    : (await ask(`Version [${defaultVersion}]: `) || defaultVersion);

  // Build entry
  const entry = {
    date: new Date().toISOString().slice(0, 10),
    version,
    summary: result.summary,
    changes: result.changes,
  };

  // Read existing changelog and prepend
  let changelog = [];
  try {
    changelog = JSON.parse(readFileSync(CHANGELOG_PATH, 'utf-8'));
  } catch {}

  changelog.unshift(entry);
  writeFileSync(CHANGELOG_PATH, JSON.stringify(changelog, null, 2) + '\n');

  console.log(`\n✅ Added ${version} to changelog.json`);
  console.log(`   ${entry.changes.length} changes logged for ${entry.date}\n`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
