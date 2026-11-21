// A working gta6-trophy-guide-01 entry (Node 22, standard library only): the guide is this directory's app/ folder,
// plain static files a browser opens at app/index.html (ES modules, CSS, no build step), offline: it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json. The program hands it in: it copies app/
// and screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Only the plumbing, not a winner: a plain checklist of the 55 trophies with a one-line hint each. Write a real guide
// for every trophy in your own words, a roadmap to the platinum, filters and a spoiler setting in app/, put 3 or 4 PNG
// or JPEG screenshots of it in screenshots/ (the first by name is the cover; shots.json says which views this
// starter's were taken of), and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const trophyData = JSON.parse(readFileSync(join(here, 'app/data/trophies.json'), 'utf8'));
const trophies = trophyData.trophies;
const gradeCounts = Object.fromEntries(['platinum', 'gold', 'silver', 'bronze'].map(grade => [
  grade, trophies.filter(trophy => trophy.grade === grade).length,
]));
const expectedGrades = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
if (trophies.length !== 55 || JSON.stringify(gradeCounts) !== JSON.stringify(expectedGrades)) {
  throw new Error(`Invalid trophy list: expected 55 trophies with 1/2/6/46 grade split; got ${trophies.length} and ${JSON.stringify(gradeCounts)}`);
}
if (trophies.some(trophy => typeof trophy.guide !== 'string' || !trophy.guide.trim())) {
  throw new Error('Every trophy must have a non-empty guide.');
}
const kinds = ['story', 'completion', 'collectible', 'activity', 'misc'];
const kindCounts = Object.fromEntries(kinds.map(kind => [kind, trophies.filter(trophy => trophy.kind === kind).length]));
console.log(`Guide validation: ${trophies.length} trophies | grades ${Object.entries(gradeCounts).map(([name, count]) => `${name} ${count}`).join(', ')} | kinds ${Object.entries(kindCounts).map(([name, count]) => `${name} ${count}`).join(', ')}`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
