// Builds the site and publishes dist/ to the `deploy` branch, which Hostinger
// pulls into public_html. History on `deploy` stays linear (fast-forward only),
// so Hostinger's `git pull` never meets a rewritten branch. Run: npm run deploy
import { execSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const work = path.join(root, '.deploy-tmp');
const BRANCH = 'deploy';
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });
const out = (cmd, cwd = root) => execSync(cmd, { cwd, encoding: 'utf8' }).trim();

if (out('git status --porcelain')) {
  console.error('Commit or stash your changes first, so each deploy matches a commit on main.');
  process.exit(1);
}
const sha = out('git rev-parse --short HEAD');

run('npm run build');

if (existsSync(work)) run(`git worktree remove --force "${work}"`);
const remoteHasBranch = out(`git ls-remote --heads origin ${BRANCH}`) !== '';
if (remoteHasBranch) {
  run(`git fetch origin ${BRANCH}`);
  run(`git worktree add -B ${BRANCH} "${work}" origin/${BRANCH}`);
} else {
  run(`git worktree add --detach "${work}"`);
  run(`git checkout --orphan ${BRANCH}`, work);
}

try {
  // Replace everything except git metadata with the fresh build.
  for (const entry of readdirSync(work)) {
    if (entry !== '.git') rmSync(path.join(work, entry), { recursive: true, force: true });
  }
  cpSync(dist, work, { recursive: true });
  run('git add -A', work);
  if (!out('git status --porcelain', work)) {
    console.log('Nothing changed since the last deploy.');
  } else {
    run(`git commit -m "Deploy ${sha}"`, work);
    run(`git push origin ${BRANCH}`, work);
    console.log(`Deployed ${sha} to the ${BRANCH} branch.`);
  }
} finally {
  run(`git worktree remove --force "${work}"`);
}
