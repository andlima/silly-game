# [Project Name] – Agent Notes

## Spec-Driven Development

New features and improvements are described in **spec files** under `specs/`.
Each spec is a self-contained task for an agent to implement autonomously.

### The `spec` CLI

The `spec` command is the primary interface for humans and agents.

**Primary commands:**

| Command | What it does |
|---------|-------------|
| `spec create [--spec ID]` | Author a new spec interactively |
| `spec implement --spec ID [--agent claude\|codex] [--review-agent claude\|codex]` | Start/resume implementation workflow |
| `spec status --spec ID` | Show run state and gate status |
| `spec list [--all]` | List specs with status and dependencies |
| `spec show --spec ID` | Display a spec's content |
| `spec report --status ok\|blocked\|error` | Report implement-phase completion |
| `spec clean --spec ID` | Remove worktrees and branches |
| `spec task [--agent claude\|codex] [--review-agent claude\|codex]` | Describe and execute a quick task |

### Worktree-Only Editing Rule

**Never edit files in the main worktree.** The main worktree is for
orchestration only — running `spec implement`, `spec status`, etc. All file
changes must happen in a dedicated worktree.

### Implement Agent Contract

When launched by the orchestrator for `implement`, follow this contract:

1. **Read context first** — read the spec file and `AGENTS.md` before editing.
2. **Stay in the provided worktree** — do not switch branches or start another run.
3. **Apply only this attempt's scope**:
   - Initial/retry: implement remaining spec work
   - Verify retry: fix the failing gate output provided by orchestrator
   - Review retry: address unresolved review findings only
   - Merge-conflict retry: resolve merge conflicts only
4. **Bump the version.** For code-changing specs, run `npm run bump`
   (defaults to patch). If the spec frontmatter sets `bump:` to `minor` or
   `major`, run `npm run bump -- minor` / `npm run bump -- major`. If
   `bump: none`, skip. Commit the resulting `package.json` and
   `src/version.js` changes alongside the rest of your work. Doc-only and
   spec-only changes should set `bump: none`.
5. **Run verify gates locally** before reporting.
6. **Do not run orchestrator lifecycle commands** (`spec implement`,
   `spec phase`) or publish/merge/cleanup actions from inside the
   implementation session. `spec report` is the exception — it is required
   (see step 7).
7. **Report completion before exit**:
   ```bash
   spec report --status ok|blocked|error --summary "..."
   ```
   Wait for `Completion recorded for <spec-id>:` before exiting.

### Spec Frontmatter

Spec files start with a YAML frontmatter block. Recognized fields:

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Spec identifier (matches the filename). |
| `status` | yes | `not-started` for new specs; `obsolete` to exclude from dispatch. |
| `area` | yes | Free-form area tag (e.g. `feature`, `infra`, `backend`). |
| `priority` | yes | Integer; lower runs first. |
| `depends_on` | yes | List of spec ids that must ship first (may be empty). |
| `description` | yes | One-line summary. |
| `bump` | no | `patch` (default) \| `minor` \| `major` \| `none`. Controls the version bump performed during implement. Use `none` for doc-only / spec-only changes. |

### Branch and Worktree Conventions

| Type | Branch | Worktree |
|------|--------|----------|
| Spec implementation | `code/<spec-id>--<run-token>` | `.worktrees/code-<spec-id>--<run-token>/` |
| Task | `task/<slug>--<token>` | `.worktrees/task-<slug>--<token>/` |
| Spec authoring | `spec/<spec-id>` | `.worktrees/spec-<spec-id>/` |
