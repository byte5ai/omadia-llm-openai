#!/usr/bin/env node
/**
 * build-zip.mjs — stage this connector into an uploadable hub ZIP.
 *
 *     npm run build && npm run package     # → out/<id>-<version>.zip
 *
 * ## Why this exists
 *
 * This repo previously had no way to cut its own release artifact — the
 * 0.1.0 ZIP on the hub was built by hand. Adapted from
 * `omadia-channel-teams/scripts/build-zip.mjs` (byte5ai/omadia-channel-teams),
 * simplified for this plugin's much smaller surface (no `appPackage/`,
 * `assets/`, or `skills/` — this is a purely declarative LLM-provider
 * manifest, no runtime provider code).
 *
 * ## Archive layout: FLAT, on purpose
 *
 * The archive root holds `manifest.yaml`, `package.json`, `README.md` and
 * `dist/` directly — no wrapping `<id>-<version>-package/` directory. This
 * matches the live 0.1.0 artifact byte-for-byte (verified by downloading and
 * diffing it before writing this script), including that `package.json`
 * ships as-is with `devDependencies` intact — unlike `channel-teams`, this
 * plugin has never stripped them, so this script doesn't start now.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const pkgRoot = process.cwd();

/** Everything the host needs at runtime. `node_modules` must never be in here. */
const REQUIRED_FILES = ['manifest.yaml', 'package.json'];
const REQUIRED_DIRS = ['dist'];
const OPTIONAL_FILES = ['README.md', 'README.de.md', 'LICENSE'];

/** The manifest's `lifecycle.entry`. Its absence means `tsc` did not finish. */
const REQUIRED_IN_DIST = ['plugin.js'];

const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));
if (!pkg.name || !pkg.version) {
  throw new Error('package.json: "name" and "version" are required');
}

// --- version drift guard ---------------------------------------------------
// The version lives in two files and the hub reads the MANIFEST, not
// package.json. When they disagree, the published artifact carries a
// different version than the repository believes it cut.
const manifestText = readFileSync(join(pkgRoot, 'manifest.yaml'), 'utf8');
const manifestVersion = manifestText.match(/^\s{2}version:\s*["']?([^"'\s]+)/m)?.[1];
if (!manifestVersion) {
  throw new Error('manifest.yaml: could not read identity.version');
}
if (manifestVersion !== pkg.version) {
  throw new Error(
    `version drift: package.json says ${pkg.version}, manifest.yaml says ${manifestVersion}. ` +
      'The hub reads the manifest — bump both.',
  );
}

// --- stage -------------------------------------------------------------
const safeName = pkg.name.replace(/^@/, '').replace(/\//g, '-');
const outDir = join(pkgRoot, 'out');
const stageDir = join(outDir, `${safeName}-${pkg.version}-stage`);
rmSync(stageDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });

for (const rel of REQUIRED_FILES) {
  const src = join(pkgRoot, rel);
  if (!existsSync(src)) throw new Error(`missing required file: ${rel}`);
  cpSync(src, join(stageDir, rel));
  console.log(`  + ${rel}`);
}

for (const rel of REQUIRED_DIRS) {
  const src = join(pkgRoot, rel);
  if (!existsSync(src)) {
    const hint = rel === 'dist' ? ' — run `npm run build` first' : '';
    throw new Error(`missing required dir: ${rel}/${hint}`);
  }
  cpSync(src, join(stageDir, rel), { recursive: true });
  console.log(`  + ${rel}/`);
}

for (const rel of OPTIONAL_FILES) {
  const src = join(pkgRoot, rel);
  if (!existsSync(src)) continue;
  cpSync(src, join(stageDir, rel), { recursive: true });
  console.log(`  + ${rel}`);
}

for (const rel of REQUIRED_IN_DIST) {
  if (!existsSync(join(stageDir, 'dist', rel))) {
    throw new Error(`staged dist/ is missing ${rel} — the build artefact is incomplete`);
  }
}

// --- zip -----------------------------------------------------------------
const zipPath = join(outDir, `${safeName}-${pkg.version}.zip`);
rmSync(zipPath, { force: true });
createFlatZip({ zipPath, stageDir });

console.log(`✓ built ${zipPath} (${statSync(zipPath).size} bytes)`);

/**
 * Archive the CONTENTS of `stageDir` at the archive root, using whichever
 * zipper this machine has.
 */
function createFlatZip({ zipPath, stageDir }) {
  const EXCLUDES = ['*.DS_Store', 'node_modules/*', '*.tsbuildinfo'];
  const strategies = [
    {
      label: 'zip',
      cmd: 'zip',
      args: ['-r', '-q', zipPath, '.', ...EXCLUDES.flatMap((p) => ['-x', p])],
      opts: { cwd: stageDir, stdio: 'inherit' },
    },
    {
      label: '7z',
      cmd: '7z',
      args: ['a', '-tzip', '-bd', '-bso0', zipPath, '.'],
      opts: { cwd: stageDir, stdio: 'inherit' },
    },
    {
      label: 'Compress-Archive',
      cmd: process.platform === 'win32' ? 'powershell' : 'pwsh',
      args: [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Compress-Archive -Path '${stageDir.replace(/'/g, "''")}/*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`,
      ],
      opts: { stdio: 'inherit' },
    },
  ];

  const attempted = [];
  for (const s of strategies) {
    const res = spawnSync(s.cmd, s.args, s.opts);
    if (res.error?.code === 'ENOENT') {
      attempted.push(`${s.label} (not found)`);
      continue;
    }
    if (res.error) {
      attempted.push(`${s.label} (${res.error.message})`);
      continue;
    }
    if (res.status === 0 && existsSync(zipPath)) return;
    attempted.push(`${s.label} (exit ${res.status})`);
  }

  throw new Error(
    `could not create ${zipPath} — no working zip tool. Tried: ${attempted.join(', ')}. ` +
      'Install `zip`, install 7-Zip (`7z`), or ensure PowerShell (Compress-Archive) is available.',
  );
}
