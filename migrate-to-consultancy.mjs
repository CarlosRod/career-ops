#!/usr/bin/env node
/**
 * migrate-to-consultancy.mjs — One-shot migration from single-candidate to consultancy mode
 *
 * Converts a career-ops install with root-level cv.md + config/profile.yml
 * into the multi-consultant roster layout.
 *
 * Usage: node migrate-to-consultancy.mjs [--slug=<name>] [--dry-run]
 *
 * If --slug is omitted, derives slug from candidate.full_name in config/profile.yml
 * via kebab-case (e.g., "Jane Smith" -> "jane-smith").
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import yaml from 'js-yaml';
const parseYaml = yaml.load;
const stringifyYaml = yaml.dump;

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

// ANSI colors (only on TTY)
const isTTY = process.stdout.isTTY;
const green = (s) => isTTY ? `\x1b[32m${s}\x1b[0m` : s;
const red = (s) => isTTY ? `\x1b[31m${s}\x1b[0m` : s;
const dim = (s) => isTTY ? `\x1b[2m${s}\x1b[0m` : s;
const bold = (s) => isTTY ? `\x1b[1m${s}\x1b[0m` : s;

function log(msg) { console.log(msg); }
function ok(msg) { log(`${green('✓')} ${msg}`); }
function skip(msg) { log(`${dim('○')} ${msg}`); }
function fail(msg) { log(`${red('✗')} ${msg}`); }

// ---- Helpers ----

function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveSlug() {
  const slugArg = process.argv.find(a => a.startsWith('--slug='));
  if (slugArg) {
    const slug = slugArg.split('=')[1].trim();
    if (!slug) {
      fail('--slug value is empty');
      process.exit(1);
    }
    return slug;
  }

  // Derive from profile.yml
  const profilePath = join(PROJECT_ROOT, 'config', 'profile.yml');
  if (!existsSync(profilePath)) {
    fail('config/profile.yml not found and --slug not provided');
    process.exit(1);
  }

  const profile = parseYaml(readFileSync(profilePath, 'utf-8'));
  const name = profile?.candidate?.full_name;
  if (!name) {
    fail('candidate.full_name not found in config/profile.yml — use --slug=<name> instead');
    process.exit(1);
  }

  return toKebabCase(name);
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function safeCopy(src, dest, label) {
  if (!existsSync(src)) {
    skip(`${label} — not found, skipping`);
    return false;
  }
  if (DRY_RUN) {
    ok(`${label} — would copy ${src} → ${dest}`);
    return true;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  ok(label);
  return true;
}

function safeMove(src, dest, label) {
  if (!existsSync(src)) {
    skip(`${label} — not found, skipping`);
    return false;
  }
  if (DRY_RUN) {
    ok(`${label} — would move ${src} → ${dest}`);
    return true;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  ok(label);
  return true;
}

// Files to clean up after all steps succeed
const movedOriginals = [];

function trackOriginal(path) {
  if (existsSync(path)) movedOriginals.push(path);
}

function cleanupOriginals() {
  if (DRY_RUN || movedOriginals.length === 0) return;
  log(`\n${bold('Cleanup:')} Removing migrated originals\n`);
  for (const file of movedOriginals) {
    try {
      unlinkSync(file);
      ok(`Removed ${file.replace(PROJECT_ROOT, '').replace(/^[/\\]/, '')}`);
    } catch {
      skip(`Could not remove ${file} — remove manually`);
    }
  }
}

// ---- Pre-flight ----

function preflight() {
  log(`\n${bold('migrate-to-consultancy')} — pre-flight checks\n`);

  const errors = [];

  // Check cv.md exists
  if (!existsSync(join(PROJECT_ROOT, 'cv.md'))) {
    errors.push('cv.md not found in project root');
  }

  // Check config/profile.yml exists
  if (!existsSync(join(PROJECT_ROOT, 'config', 'profile.yml'))) {
    errors.push('config/profile.yml not found');
  }

  // Check we're not already migrated
  if (existsSync(join(PROJECT_ROOT, 'config', 'firm.yml'))) {
    errors.push('config/firm.yml already exists — looks like migration was already run');
  }

  // Run doctor.mjs
  log('Running doctor.mjs...');
  try {
    execFileSync('node', [join(PROJECT_ROOT, 'doctor.mjs')], { stdio: 'pipe' });
    ok('doctor.mjs passed');
  } catch (e) {
    const output = e.stdout?.toString() || e.stderr?.toString() || '';
    // Only fail on real issues (cv.md and profile.yml will be there since we checked above)
    if (e.status === 1) {
      log(dim(output));
      errors.push('doctor.mjs failed — fix issues before migrating');
    }
  }

  if (errors.length > 0) {
    log('');
    for (const err of errors) {
      fail(err);
    }
    log(`\n${red('Pre-flight failed.')} Fix errors before migrating.\n`);
    process.exit(1);
  }

  ok('Pre-flight passed');
}

// ---- Backup ----

function backup(ts) {
  const backupDir = join(PROJECT_ROOT, '.migration-backup', ts);
  log(`\n${bold('Step 1:')} Backup originals → .migration-backup/${ts}/\n`);

  if (DRY_RUN) {
    ok(`Would create backup at ${backupDir}`);
    return;
  }

  mkdirSync(backupDir, { recursive: true });

  const filesToBackup = [
    'cv.md',
    'config/profile.yml',
    'modes/_profile.md',
    'article-digest.md',
    'interview-prep/story-bank.md',
  ];

  for (const file of filesToBackup) {
    const src = join(PROJECT_ROOT, file);
    if (existsSync(src)) {
      const dest = join(backupDir, file);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      ok(`Backed up ${file}`);
    }
  }

  // Backup the tracker if it exists
  const trackerPath = existsSync(join(PROJECT_ROOT, 'data', 'applications.md'))
    ? 'data/applications.md'
    : existsSync(join(PROJECT_ROOT, 'applications.md'))
      ? 'applications.md'
      : null;

  if (trackerPath) {
    const dest = join(backupDir, trackerPath);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(PROJECT_ROOT, trackerPath), dest);
    ok(`Backed up ${trackerPath}`);
  }
}

// ---- Step 2: Resolve slug ----

// ---- Step 3: Move CV + digest into roster ----

function moveFilesToRoster(slug) {
  const consultantDir = join(PROJECT_ROOT, 'consultants', slug);
  log(`\n${bold('Step 3:')} Move files → consultants/${slug}/\n`);

  if (!DRY_RUN) {
    mkdirSync(consultantDir, { recursive: true });
  }

  const cvSrc = join(PROJECT_ROOT, 'cv.md');
  const digestSrc = join(PROJECT_ROOT, 'article-digest.md');

  safeMove(cvSrc, join(consultantDir, 'cv.md'), 'cv.md → consultants/' + slug + '/cv.md');
  trackOriginal(cvSrc);

  safeMove(digestSrc, join(consultantDir, 'article-digest.md'), 'article-digest.md → consultants/' + slug + '/article-digest.md');
  trackOriginal(digestSrc);
}

// ---- Step 4: Split profile.yml ----

function splitProfile(slug) {
  log(`\n${bold('Step 4:')} Split config/profile.yml\n`);

  const profilePath = join(PROJECT_ROOT, 'config', 'profile.yml');
  const profile = parseYaml(readFileSync(profilePath, 'utf-8'));

  // firm.yml gets firm-level defaults (most fields are new)
  const firm = {
    firm: {
      name: 'My Consultancy',
      contact_email: profile?.candidate?.email || 'contact@example.com',
      website: profile?.candidate?.portfolio_url || null,
      language: 'en',
    },
    shortlist: {
      policy: 'hybrid',
      threshold: 4.0,
    },
    compensation: {
      currency: profile?.compensation?.currency || 'USD',
    },
  };

  // consultant profile.yml keeps all personal fields (same structure as original)
  const consultantProfile = { ...profile };

  const firmPath = join(PROJECT_ROOT, 'config', 'firm.yml');
  const consultantProfilePath = join(PROJECT_ROOT, 'consultants', slug, 'profile.yml');

  if (DRY_RUN) {
    ok('Would create config/firm.yml');
    ok(`Would create consultants/${slug}/profile.yml`);
    log(dim('\n  firm.yml preview:'));
    log(dim('  ' + stringifyYaml(firm).split('\n').join('\n  ')));
  } else {
    writeFileSync(firmPath, `# Career-Ops Firm Configuration\n# Generated by migrate-to-consultancy.mjs\n\n${stringifyYaml(firm, { lineWidth: -1 })}`);
    ok('Created config/firm.yml');

    mkdirSync(dirname(consultantProfilePath), { recursive: true });
    writeFileSync(consultantProfilePath, `# Consultant Profile — ${profile?.candidate?.full_name || slug}\n# Migrated from config/profile.yml\n\n${stringifyYaml(consultantProfile, { lineWidth: -1 })}`);
    ok(`Created consultants/${slug}/profile.yml`);
  }
}

// ---- Step 5: Copy _profile.md to per-consultant ----

function migrateProfileMd(slug) {
  log(`\n${bold('Step 5:')} Copy modes/_profile.md → per-consultant\n`);

  const src = join(PROJECT_ROOT, 'modes', '_profile.md');
  const dest = join(PROJECT_ROOT, 'consultants', slug, '_profile.md');

  if (existsSync(src)) {
    safeCopy(src, dest, `modes/_profile.md → consultants/${slug}/_profile.md`);
  } else {
    skip('modes/_profile.md not found — skipping');
  }
}

// ---- Step 6: Migrate story bank ----

function migrateStoryBank(slug) {
  log(`\n${bold('Step 6:')} Migrate story bank\n`);

  const src = join(PROJECT_ROOT, 'interview-prep', 'story-bank.md');
  const dest = join(PROJECT_ROOT, 'consultants', slug, 'story-bank.md');

  if (existsSync(src)) {
    safeMove(src, dest, `interview-prep/story-bank.md → consultants/${slug}/story-bank.md`);
    trackOriginal(src);
  } else {
    // Create empty story bank
    if (DRY_RUN) {
      ok(`Would create empty consultants/${slug}/story-bank.md`);
    } else {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, `# Story Bank — ${slug}\n\nAccumulated STAR+R stories from evaluations.\n`);
      ok(`Created empty consultants/${slug}/story-bank.md`);
    }
  }
}

// ---- Step 7: Rewrite modes/_profile.md to firm-level boilerplate ----

function rewriteFirmProfile() {
  log(`\n${bold('Step 7:')} Rewrite modes/_profile.md to firm-level\n`);

  const dest = join(PROJECT_ROOT, 'modes', '_profile.md');

  const boilerplate = `# Firm Profile Context -- career-ops (consultancy mode)

<!-- ============================================================
     THIS FILE IS THE FIRM-LEVEL PROFILE.

     Shared across all consultants: negotiation scripts,
     location policy, default archetypes.

     Per-consultant overrides go in consultants/{slug}/_profile.md.
     ============================================================ -->

## Firm-Level Negotiation Scripts

**Salary expectations:**
> "Based on market data for this role, we're targeting [RANGE]. We're flexible on structure -- what matters is the total package and the opportunity."

**Geographic discount pushback:**
> "Our consultants work output-based, not location-based. Their track record doesn't change based on postal code."

**When offered below target:**
> "We're comparing with opportunities in the [higher range]. We're drawn to [company] because of [reason]. Can we explore [target]?"

## Firm-Level Location Policy

**In evaluations (scoring):**
- Remote dimension for hybrid outside consultant's country: score **3.0** (not 1.0)
- Only score 1.0 if JD says "must be on-site 4-5 days/week, no exceptions"

## Default Archetypes

Per-consultant archetypes in their respective \`_profile.md\` files override these defaults.
Refer to each consultant's \`profile.yml\` for their specific target roles and archetypes.
`;

  if (DRY_RUN) {
    ok('Would rewrite modes/_profile.md to firm-level boilerplate');
  } else {
    writeFileSync(dest, boilerplate);
    ok('Rewrote modes/_profile.md to firm-level boilerplate');
  }
}

// ---- Step 8: Rewrite tracker to 10-col ----

function rewriteTracker(slug) {
  log(`\n${bold('Step 8:')} Rewrite tracker to 10 columns\n`);

  const trackerPath = existsSync(join(PROJECT_ROOT, 'data', 'applications.md'))
    ? join(PROJECT_ROOT, 'data', 'applications.md')
    : existsSync(join(PROJECT_ROOT, 'applications.md'))
      ? join(PROJECT_ROOT, 'applications.md')
      : null;

  if (!trackerPath) {
    skip('No applications.md found — nothing to rewrite');
    return;
  }

  const content = readFileSync(trackerPath, 'utf-8');
  const lines = content.split('\n');
  const newLines = [];

  for (const line of lines) {
    if (!line.startsWith('|')) {
      newLines.push(line);
      continue;
    }

    const parts = line.split('|').map(s => s.trim());

    // Header row: insert "Candidate" after "Role"
    // Detect by checking for common header labels
    const isHeader = parts.some(p =>
      /^(#|Date|Company|Role|Score|Status|PDF|Report|Notes|Empresa|Fecha|Rol|---)/i.test(p)
    );

    if (isHeader) {
      if (line.includes('---')) {
        // Separator row: add one more column
        const sepParts = line.split('|');
        // Insert a separator cell after the 5th pipe (after Role)
        // Format: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
        //          0     1     2     3     4     5     6     7     8     9
        // We need to insert after index 4 (Role)
        sepParts.splice(5, 0, '---');
        newLines.push(sepParts.join('|'));
      } else if (/^(#|Date|Fecha)/i.test(parts[1])) {
        // Actual header: insert Candidate after Role (parts[4])
        parts.splice(5, 0, 'Candidate');
        newLines.push('| ' + parts.filter(p => p !== '').join(' | ') + ' |');
      } else {
        newLines.push(line);
      }
      continue;
    }

    // Data row: insert candidate slug after Role (parts[4])
    const num = parseInt(parts[1]);
    if (!isNaN(num) && num > 0) {
      parts.splice(5, 0, slug);
      newLines.push('| ' + parts.filter(p => p !== '').join(' | ') + ' |');
    } else {
      newLines.push(line);
    }
  }

  if (DRY_RUN) {
    ok('Would rewrite tracker to 10 columns');
    // Show first few lines
    const preview = newLines.filter(l => l.startsWith('|')).slice(0, 3);
    for (const l of preview) {
      log(dim('  ' + l));
    }
  } else {
    writeFileSync(trackerPath, newLines.join('\n'));
    ok('Tracker rewritten to 10 columns');
  }
}

// ---- Step 9: Summary ----

function summary(slug, ts) {
  log(`\n${'='.repeat(50)}`);
  log(`${bold('Migration complete!')}\n`);
  log(`  Consultant slug:  ${bold(slug)}`);
  log(`  Roster:           consultants/${slug}/`);
  log(`  Firm config:      config/firm.yml`);
  log(`  Backup:           .migration-backup/${ts}/`);
  log('');
  log('Next steps:');
  log(`  1. Review config/firm.yml and fill in your firm name`);
  log(`  2. Review consultants/${slug}/profile.yml`);
  log(`  3. Add more consultants: mkdir consultants/<slug> and add cv.md + profile.yml`);
  log(`  4. Run: node cv-sync-check.mjs`);
  log(`  5. Run: node verify-pipeline.mjs`);
  log('');
  log(`${dim('To rollback: see docs/migration/rollback.md')}`);
  log(`${dim(`Backup location: .migration-backup/${ts}/`)}`);
  log('');
}

// ---- Main ----

async function main() {
  // Pre-flight
  await preflight();

  // Resolve slug
  const slug = resolveSlug();
  log(`\n${bold('Step 2:')} Slug resolved: ${bold(slug)}\n`);

  const ts = timestamp();

  if (DRY_RUN) {
    log(`${dim('(dry-run mode — no files will be modified)')}\n`);
  }

  // Execute steps
  backup(ts);
  moveFilesToRoster(slug);
  splitProfile(slug);
  migrateProfileMd(slug);
  migrateStoryBank(slug);
  rewriteFirmProfile();
  rewriteTracker(slug);
  cleanupOriginals();
  summary(slug, ts);

  if (DRY_RUN) {
    log(`${dim('(dry-run — no changes were written)')}\n`);
  }
}

main().catch((err) => {
  fail(`Migration failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
