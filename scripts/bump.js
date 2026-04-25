// Bumps package.json version and re-stamps src/version.js in one step.
// Usage: npm run bump [-- patch|minor|major]   (default: patch)
import { execSync } from 'node:child_process';

const level = process.argv[2] || 'patch';
if (!['patch', 'minor', 'major'].includes(level)) {
  console.error(`Invalid bump level: ${level}. Use patch, minor, or major.`);
  process.exit(1);
}

execSync(`npm version --no-git-tag-version ${level}`, { stdio: 'inherit' });
execSync('npm run stamp', { stdio: 'inherit' });
