---
id: example-feature
status: not-started
area: backend
priority: 50
depends_on: []
bump: patch          # patch | minor | major | none — default: patch
description: Short one-line description of the feature
---

Always use `status: not-started` — this is the correct default.
To permanently exclude a spec from dispatch, use `status: obsolete`.

# Example Feature

## Goal

Describe what this spec achieves and why it matters. Keep it to 2-3 sentences.

## Acceptance Criteria

1. First concrete, testable requirement
2. Second requirement
3. Third requirement

## Out of Scope

- Things explicitly not covered by this spec
- Helps prevent scope creep

## Design Notes

Optional section for implementation hints, architectural constraints, or
references to relevant code paths.

## Verify

1. <feature-specific check>
2. <feature-specific check>
3. Run `npm run bump` (or `npm run bump -- minor|major` if the spec sets
   a non-default `bump:` level; skip if `bump: none`) and commit the
   updated `package.json` and `src/version.js`.

## Agent Notes

Optional section with tips for the implementing agent — common pitfalls,
files to read first, ordering advice, etc.
