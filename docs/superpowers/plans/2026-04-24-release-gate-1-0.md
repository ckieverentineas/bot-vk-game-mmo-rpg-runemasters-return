# Release Gate 1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a strict local `release:gate` that runs the full 1.0 release sequence and blocks on evidence, docs, content, and release-document drift.

**Architecture:** Keep orchestration thin and push rules into a pure `release-gate-lib` with typed inputs and deterministic results. Evidence gets explicit `blocker`, `manual_decision`, and `info` findings; release docs become small checked artifacts rather than implicit prose.

**Tech Stack:** TypeScript, Node `fs/path/child_process`, Vitest, existing release tooling.

---

### Task 1: Evidence Findings

**Files:**
- Modify: `src/tooling/release/release-evidence-generator.ts`
- Test: `src/tooling/release/release-evidence.test.ts`

- [ ] **Step 1: Write failing tests for finding severities**

Add expectations that duplicate rewards create `blocker`, missing return recap follow-up creates `manual_decision`, and confidence notes remain `info`.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- src/tooling/release/release-evidence.test.ts`

Expected: FAIL because `ReleaseEvidenceFinding` does not exist.

- [ ] **Step 3: Add typed findings**

Add:

```ts
export type ReleaseEvidenceFindingSeverity = 'blocker' | 'manual_decision' | 'info';

export interface ReleaseEvidenceFinding {
  readonly id: string;
  readonly severity: ReleaseEvidenceFindingSeverity;
  readonly message: string;
}
```

Keep `verdict` for compatibility, but derive it from findings:

- any `blocker` -> `insufficient_evidence`;
- any `manual_decision` -> `warn`;
- otherwise `pass`.

- [ ] **Step 4: Render grouped findings in markdown**

Add sections:

- `## Blockers`
- `## Manual release-owner decisions`
- `## Info`

No raw “warn and ладно” prose.

- [ ] **Step 5: Run the focused test until green**

Run: `npm test -- src/tooling/release/release-evidence.test.ts`

Expected: PASS.

### Task 2: Release Gate Library

**Files:**
- Create: `src/tooling/release/release-gate-lib.ts`
- Test: `src/tooling/release/release-gate.test.ts`

- [ ] **Step 1: Write failing library tests**

Cover:

- ordered steps;
- failed step blocks gate;
- blocker finding blocks gate;
- manual decision without accepted record blocks gate;
- manual decision with accepted record passes;
- red marker in checked doc blocks gate;
- missing manual playtest section blocks gate;
- missing economy contour blocks gate;
- missing canonical command in doc-sync blocks gate.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- src/tooling/release/release-gate.test.ts`

Expected: FAIL because the library does not exist.

- [ ] **Step 3: Implement pure gate helpers**

Add exported helpers:

```ts
export const releaseGateSteps = [
  'db:generate',
  'db:deploy',
  'check',
  'release:local-playtest',
  'release:school-evidence',
  'release:evidence',
  'release:preflight',
] as const;
```

Add `evaluateReleaseGate`, `findReleaseDocumentIssues`, `parseManualDecisions`, and `resolveManualDecisionIssues`.

- [ ] **Step 4: Run the focused test until green**

Run: `npm test -- src/tooling/release/release-gate.test.ts`

Expected: PASS.

### Task 3: Release Gate CLI

**Files:**
- Create: `src/tooling/release/release-gate.ts`
- Modify: `package.json`
- Test: `src/tooling/release/release-gate.test.ts`

- [ ] **Step 1: Add failing CLI runner test**

Inject a fake runner and assert commands run in exact order as `npm run <script>`.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- src/tooling/release/release-gate.test.ts`

Expected: FAIL because CLI runner helper does not exist.

- [ ] **Step 3: Implement CLI runner**

Use `spawnSync` with `npm.cmd` on Windows and `npm` elsewhere. Inherit stdio for real runs.

- [ ] **Step 4: Add script**

Add:

```json
"release:gate": "tsx src/tooling/release/release-gate.ts"
```

- [ ] **Step 5: Run the focused test until green**

Run: `npm test -- src/tooling/release/release-gate.test.ts`

Expected: PASS.

### Task 4: Release Docs

**Files:**
- Create: `docs/testing/manual-playtest-1-0.md`
- Create: `docs/release/economy-source-sink-1-0.md`
- Create: `docs/release/release-doc-sync-1-0.md`
- Create: `docs/release/manual-decisions.json`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `PLAN.md`
- Modify: `RELEASE_CHECKLIST.md`

- [ ] **Step 1: Write docs to satisfy gate contract**

Keep manual playtest player-facing and step-based.

- [ ] **Step 2: Update release docs with canonical command**

Mention `npm run release:gate` and remove stale incomplete command chains from release sections.

- [ ] **Step 3: Run docs-focused gate tests**

Run: `npm test -- src/tooling/release/release-gate.test.ts`

Expected: PASS.

### Task 5: Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused release tests**

Run:

```bash
npm test -- src/tooling/release/release-evidence.test.ts src/tooling/release/release-gate.test.ts src/tooling/release/release-preflight.test.ts
```

- [ ] **Step 2: Run full check**

Run:

```bash
npm run check
```

- [ ] **Step 3: Commit implementation**

Commit only the R8 release-gate implementation and docs.
