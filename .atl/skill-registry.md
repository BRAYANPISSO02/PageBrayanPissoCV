# Skill Registry

Index of skills available to sub-agents. Sub-agents receive exact `SKILL.md` paths and read the full skill source of truth; this file is an index, not a summary.

- Generated: 2026-09-14
- Scope: user-level skills (no project-level skills detected)
- Excluded by convention: `sdd-*`, `skill-registry`, `_shared`
- Duplicates across mirrored skill directories (`~/.config/opencode/skills`, `~/.claude/skills`, `~/.gemini/skills`, `~/.copilot/skills`) deduplicated by name; canonical path is `~/.config/opencode/skills` for this environment.

## Skills

| Name | Trigger (from description) | Path | Scope |
| ---- | -------------------------- | ---- | ----- |
| branch-pr | Create Gentle AI pull requests with issue-first checks. Trigger: creating, opening, or preparing PRs for review. | /home/brayanpisso/.config/opencode/skills/branch-pr/SKILL.md | user |
| chained-pr | Trigger: PRs over 400 lines, stacked PRs, review slices. Split oversized changes into chained PRs that protect review focus. | /home/brayanpisso/.config/opencode/skills/chained-pr/SKILL.md | user |
| cognitive-doc-design | Design docs that reduce cognitive load. Trigger: writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs. | /home/brayanpisso/.config/opencode/skills/cognitive-doc-design/SKILL.md | user |
| comment-writer | Write warm, direct collaboration comments. Trigger: PR feedback, issue replies, reviews, Slack messages, or GitHub comments. | /home/brayanpisso/.config/opencode/skills/comment-writer/SKILL.md | user |
| gentle-ai-bench | Trigger: bench, journey, journeys, driven mode, gentle-ai-bench, journey corpus, j-numbers, bench axis. Author and verify gentle-ai bench journeys; go test ./bench never proves driven execution. | /home/brayanpisso/.config/opencode/skills/gentle-ai-bench/SKILL.md | user |
| go-testing | Trigger: Go tests, go test coverage, Bubbletea teatest, golden files. Apply focused Go testing patterns. | /home/brayanpisso/.config/opencode/skills/go-testing/SKILL.md | user |
| issue-creation | Trigger: issue creation, bug reports, feature requests, or issue approval. Create and triage GitHub issues from repository evidence. | /home/brayanpisso/.config/opencode/skills/issue-creation/SKILL.md | user |
| judgment-day | Trigger: judgment day, dual review, adversarial review, juzgar. Run explicit blind dual review with at most two scoped fix/re-judgment rounds. | /home/brayanpisso/.config/opencode/skills/judgment-day/SKILL.md | user |
| rdd-defect-workflow | Trigger: RDD, receipt-driven development, review authority, receipt/lineage, correction/recovery, delivery gate/kill switch, bounded review defects. Guide work. | /home/brayanpisso/.config/opencode/skills/rdd-defect-workflow/SKILL.md | user |
| skill-creator | Trigger: new skills, agent instructions, documenting AI usage patterns. Create LLM-first skills with valid frontmatter. | /home/brayanpisso/.config/opencode/skills/skill-creator/SKILL.md | user |
| skill-improver | Trigger: improve skills, audit skills, refactor skills, skill quality. Audit and upgrade existing LLM-first skills. | /home/brayanpisso/.config/opencode/skills/skill-improver/SKILL.md | user |
| systemic-issue-triage | Trigger: new issue, bug report, triage, backlog, issue flood, community report, root cause, dead-end, blocked user. Attack issues by root class, never one-by-one; fixes must shrink the system, not grow it. | /home/brayanpisso/.config/opencode/skills/systemic-issue-triage/SKILL.md | user |
| work-unit-commits | Plan commits as reviewable work units. Trigger: implementation, commit splitting, chained PRs, or keeping tests and docs with code. | /home/brayanpisso/.config/opencode/skills/work-unit-commits/SKILL.md | user |

## Project Convention Files

None detected (project directory is empty; no `agents.md`, `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `GEMINI.md`, or `copilot-instructions.md`).