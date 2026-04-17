#!/usr/bin/env node

/**
 * cv-sync-check.mjs — Validates consultant roster integrity.
 *
 * Checks:
 * 1. config/firm.yml exists
 * 2. consultants/ has at least one consultant with cv.md + profile.yml
 * 3. Each consultant's profile.yml has required fields
 * 4. No hardcoded metrics in _shared.md or batch/batch-prompt.md
 * 5. article-digest.md freshness per consultant (if exists)
 * 6. story-bank.md presence (warn if absent — created lazily)
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

const warnings = [];
const errors = [];

// 1. Check firm.yml exists
const firmPath = join(projectRoot, 'config', 'firm.yml');
if (!existsSync(firmPath)) {
  errors.push('config/firm.yml not found. Copy from config/firm.example.yml and fill in your firm details.');
}

// 2. Check consultants roster
const consultantsDir = join(projectRoot, 'consultants');
const consultantSlugs = [];

if (!existsSync(consultantsDir)) {
  errors.push('consultants/ directory not found. Run onboarding or migration first.');
} else {
  const entries = readdirSync(consultantsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const consultantDir = join(consultantsDir, slug);

    // Check cv.md
    const cvPath = join(consultantDir, 'cv.md');
    if (!existsSync(cvPath)) {
      errors.push(`consultants/${slug}/cv.md not found. Each consultant needs a CV.`);
    } else {
      const cvContent = readFileSync(cvPath, 'utf-8');
      if (cvContent.trim().length < 100) {
        warnings.push(`consultants/${slug}/cv.md seems too short. Make sure it contains a full CV.`);
      }
    }

    // Check profile.yml
    const profilePath = join(consultantDir, 'profile.yml');
    if (!existsSync(profilePath)) {
      errors.push(`consultants/${slug}/profile.yml not found. Each consultant needs a profile.`);
    } else {
      try {
        const profile = yaml.load(readFileSync(profilePath, 'utf-8'));
        const name = profile?.candidate?.full_name;
        const email = profile?.candidate?.email;
        const archetypes = profile?.target_roles?.archetypes;
        const comp = profile?.compensation?.target_range;

        if (!name || name === 'Jane Smith') {
          warnings.push(`consultants/${slug}/profile.yml: candidate.full_name is missing or still example data.`);
        }
        if (!email || email === 'jane@example.com') {
          warnings.push(`consultants/${slug}/profile.yml: candidate.email is missing or still example data.`);
        }
        if (!archetypes || archetypes.length === 0) {
          warnings.push(`consultants/${slug}/profile.yml: target_roles.archetypes is empty.`);
        }
        if (!comp) {
          warnings.push(`consultants/${slug}/profile.yml: compensation.target_range is missing.`);
        }
      } catch (e) {
        errors.push(`consultants/${slug}/profile.yml: YAML parse error — ${e.message}`);
      }

      consultantSlugs.push(slug);
    }

    // Check story-bank.md (warn only)
    const storyPath = join(consultantDir, 'story-bank.md');
    if (!existsSync(storyPath)) {
      warnings.push(`consultants/${slug}/story-bank.md not found. It will be created on first evaluation.`);
    }

    // Check article-digest.md freshness
    const digestPath = join(consultantDir, 'article-digest.md');
    if (existsSync(digestPath)) {
      const stats = statSync(digestPath);
      const daysSinceModified = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (daysSinceModified > 30) {
        warnings.push(`consultants/${slug}/article-digest.md is ${Math.round(daysSinceModified)} days old. Consider updating if projects have new metrics.`);
      }
    }
  }

  if (consultantSlugs.length === 0) {
    errors.push('No consultants found with profile.yml. Add at least one consultant to consultants/.');
  }
}

// 3. Check for hardcoded metrics in prompt files
const filesToCheck = [
  { path: join(projectRoot, 'modes', '_shared.md'), name: '_shared.md' },
  { path: join(projectRoot, 'batch', 'batch-prompt.md'), name: 'batch-prompt.md' },
];

const metricPattern = /\b\d{2,4}\+?\s*(hours?|%|evals?|layers?|tests?|fields?|bases?)\b/gi;

for (const { path, name } of filesToCheck) {
  if (!existsSync(path)) continue;
  const content = readFileSync(path, 'utf-8');

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('NEVER hardcode') || line.includes('NUNCA hardcode') || line.startsWith('#') || line.startsWith('<!--')) continue;
    const matches = line.match(metricPattern);
    if (matches) {
      warnings.push(`${name}:${i + 1} — Possible hardcoded metric: "${matches[0]}". Should this be read from consultant CV/article-digest?`);
    }
  }
}

// Output results
console.log('\n=== career-ops roster sync check ===\n');

if (consultantSlugs.length > 0) {
  console.log(`Roster: ${consultantSlugs.length} consultant(s) — ${consultantSlugs.join(', ')}`);
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ All checks passed.');
} else {
  if (errors.length > 0) {
    console.log(`\n❌ ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`  ${e}`));
  }
  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log(`  ${w}`));
  }
}

console.log('');
process.exit(errors.length > 0 ? 1 : 0);
