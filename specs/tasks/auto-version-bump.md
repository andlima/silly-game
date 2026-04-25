---
id: auto-version-bump
status: not-started
area: infra
priority: 50
depends_on: []
description: Make every code-changing spec/task bump package.json version and re-stamp src/version.js
---

# Auto Version Bump

## Goal

The displayed version in the help overlay and CLI help screen should advance
as we ship features and fixes. Today `package.json` sits at `0.1.0` and is
never bumped, so `src/version.js` only updates its datetime. Make the version
bump part of the standard implementation workflow: one short command, a
default level, an explicit override per spec, and clear contract language so
agents don't forget.

## Acceptance Criteria

1. `npm run bump` bumps `package.json` version (patch by default) **and**
   re-stamps `src/version.js` in a single command.
2. The level can be overridden: `npm run bump -- minor` and
   `npm run bump -- major` work. Invalid levels exit non-zero with a clear
   message.
3. Spec frontmatter supports an optional `bump:` field with values
   `patch | minor | major | none`. Default when omitted is `patch`.
   `none` means skip (used for doc-only or spec-only changes).
4. `AGENTS.md` documents the bump step as a required part of the implement
   contract for code-changing specs, including how `bump:` in frontmatter is
   honoured.
5. `specs/TEMPLATE.md` includes the `bump:` frontmatter field and a Verify
   section entry that mentions running `npm run bump` (or skipping when
   `bump: none`).
6. The bump script does not create git commits or tags on its own — the
   bumped `package.json` and regenerated `src/version.js` are committed by
   the implementing agent alongside the rest of the change.

## Out of Scope

- Any CI/automation gate that *enforces* the bump (rejected for now — keep
  it convention-driven).
- Backfilling missed bumps for prior tasks.
- Changing the `VERSION` string format in `src/version.js` (it stays
  `vX.Y.Z · YYYY-MM-DD HH:MM`).
- Auto-deciding the bump level from commit messages or diff content.

## Design Notes

### `scripts/bump.js` (new)

Small Node script, no dependencies. Reads `process.argv[2]` as the level,
defaults to `patch`, validates it, then shells out:

```js
import { execSync } from 'node:child_process';

const level = process.argv[2] || 'patch';
if (!['patch', 'minor', 'major'].includes(level)) {
  console.error(`Invalid bump level: ${level}. Use patch, minor, or major.`);
  process.exit(1);
}

execSync(`npm version --no-git-tag-version ${level}`, { stdio: 'inherit' });
execSync('npm run stamp', { stdio: 'inherit' });
```

`--no-git-tag-version` is essential — it stops `npm version` from creating a
commit and tag. The agent commits the resulting changes itself.

### `package.json`

Add one script entry:

```json
"scripts": {
  "stamp": "node scripts/stamp.js",
  "bump": "node scripts/bump.js"
}
```

### Spec frontmatter — `bump` field

Optional. Allowed values: `patch` (default), `minor`, `major`, `none`.

```yaml
---
id: some-spec
status: not-started
area: feature
priority: 50
depends_on: []
bump: minor          # optional; defaults to patch
description: ...
---
```

`none` is the escape hatch for changes that don't ship runtime behaviour
(e.g. a spec/doc-only commit). The implementing agent reads the field and
runs `npm run bump -- <level>` accordingly, or skips entirely when `none`.

### `AGENTS.md` — add to the Implement Agent Contract

Insert a new step (before "Run verify gates locally") in the numbered
contract list:

> **Bump the version.** For code-changing specs, run `npm run bump`
> (defaults to patch). If the spec frontmatter sets `bump:` to `minor` or
> `major`, run `npm run bump -- minor` / `-- major`. If `bump: none`, skip.
> Commit the resulting `package.json` and `src/version.js` changes with the
> rest of your work. Doc-only and spec-only changes should set `bump: none`
> (or use the `none` value when noted in the spec).

Renumber subsequent steps.

Also add a short "Spec frontmatter" subsection (or extend the existing
template-related guidance) noting the optional `bump:` field and its
default.

### `specs/TEMPLATE.md`

1. Add `bump:` to the example frontmatter, commented to show it is optional:

   ```yaml
   ---
   id: example-feature
   status: not-started
   area: backend
   priority: 50
   depends_on: []
   bump: patch          # patch | minor | major | none — default: patch
   description: Short one-line description of the feature
   ---
   ```

2. Add a `## Verify` section (currently missing from the template) that
   includes the bump step as a final item:

   ```markdown
   ## Verify

   1. <feature-specific check>
   2. <feature-specific check>
   3. Run `npm run bump` (or `npm run bump -- minor|major` if the spec
      sets a non-default `bump:` level; skip if `bump: none`) and commit
      the updated `package.json` and `src/version.js`.
   ```

## Changes

| File | What |
|------|------|
| `scripts/bump.js` | **New** — bump + stamp script |
| `package.json` | Add `"bump"` script entry |
| `AGENTS.md` | Add bump step to Implement Agent Contract; document `bump:` frontmatter field |
| `specs/TEMPLATE.md` | Add `bump:` to frontmatter example; add Verify section with bump step |

## Verify

1. `npm run bump` (in this worktree) bumps `package.json` from `0.1.0` to
   `0.1.1` and updates `src/version.js` to show `v0.1.1 · …`. No git tag or
   commit is created by the script.
2. `npm run bump -- minor` (try then revert) bumps to `0.2.0`.
   `npm run bump -- major` bumps to `1.0.0`. Both update `src/version.js`.
3. `npm run bump -- bogus` exits non-zero with the validation error
   message.
4. `AGENTS.md` and `specs/TEMPLATE.md` reflect the new contract step and
   `bump:` frontmatter field.
5. Commit the final `package.json` + `src/version.js` resulting from
   step 1 along with the new script and doc updates. (This spec is itself a
   code-changing change and should ship a real version bump — `bump: patch`
   default applies.)

## Agent Notes

- Don't hand-edit `src/version.js`; always regenerate via the script.
- `npm version --no-git-tag-version` is the right invocation. Without that
  flag npm will try to create a commit/tag, which we don't want — the agent
  commits its own work.
- When trying the `minor`/`major` levels during verification, reset
  `package.json` back to the patched value (e.g. via `git checkout
  package.json src/version.js`) before running `npm run bump` for the final
  patch bump that ships with this spec.
- The repo has no lockfile and no dependencies, so `npm version` won't
  touch anything beyond `package.json`.
