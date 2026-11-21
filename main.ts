// Vice Heat Studio — hand-in program (Node 22, standard library only).
//
// The entry itself is the static web app in app/ next to this file: plain
// HTML, CSS and ES modules that a desktop browser runs fully offline, with
// every font, sample photo and script vendored under app/. Handing in means
// staging that folder, plus the screenshots/ folder, into the output
// directory and writing the dossier the judge reads.
//
// The output directory is /output inside the grader's container; anywhere
// else, MAKEFUN_OUTPUT_DIR points at a stand-in:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Stage the app first, then the screenshots, so the dossier built below
// describes exactly the tree the judge receives.
mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outDir, 'app'), { recursive: true });

mkdirSync(join(outDir, 'screenshots'), { recursive: true });
const localShots = join(repoDir, 'screenshots');
if (existsSync(localShots)) {
  cpSync(localShots, join(outDir, 'screenshots'), { recursive: true });
}

// A hand-in with no screenshots is a broken entry — the first screenshot
// by name is the cover the judge sees — so refuse loudly here instead of
// letting buildDossier fail later with a less obvious complaint.
const shotNames = readdirSync(join(outDir, 'screenshots'))
  .filter((name) => /\.(?:png|jpe?g)$/i.test(name))
  .sort();
if (shotNames.length === 0) {
  throw new Error('no screenshots to hand in: screenshots/ must hold at least the cover image');
}

// The caps mirror the scorer's gate: the text budget shapes the dossier
// bytes, the rest make this program refuse anything the scorer would
// refuse anyway (too many screenshots, an oversized screenshot, an app
// tree past the file, byte or path limits).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Say what was handed in, so a local run is checkable at a glance.
console.log(`handed in: app/ staged, ${shotNames.length} screenshots (${shotNames.join(', ')}), dossier.json ${dossier.length} bytes -> ${outDir}`);
