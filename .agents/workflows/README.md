# Focused Review Workflows

These workflows are opt-in and intentionally small. Use them when a narrow review can answer a specific risk question more cheaply than a full repo-wide pass.

- `AGENTS.md` is the source of truth for validation, security, code conventions, escalation, and final agent responsibilities.
- Prefer the smallest workflow that matches the risk. These workflows are suitable for a smaller or cheaper review model when the task is narrow.
- Do not write broad repository summaries. Report constraint failures and concrete risks only.
- Review subagents must not make code changes unless explicitly assigned implementation responsibility.
- Review subagents must not run validation commands unless explicitly assigned validation responsibility.
- The main agent remains responsible for final integration, validation choices, and conflict resolution.

All workflows use the same output format:

```text
Scope: <files or diff slice reviewed>
Findings:
- blocker: <actionable issue> | no issue
- should-fix: <actionable issue> | no issue
- optional: <actionable improvement> | no issue
Escalation:
- <broader validation or follow-up needed> | none
```

## Wrapper

Use `pnpm review:workflows -- <paths...>` to generate compact review briefs for the smallest matching workflow set. Running `pnpm review:workflows` without explicit paths uses the current git diff.

- The wrapper keeps `architecture-review` in the first parallel batch and `validation-plan` in the follow-up batch.
- Risk-specific workflows are added only when the changed paths suggest they are relevant.
- Suggested model tiers are hints for cost control, not policy.
- The wrapper only prepares briefs. It does not spawn subagents, edit code, or run validation.

Examples:

```bash
pnpm review:workflows -- src/utils/liveSession/route.ts src/shared/liveSession/types.ts
pnpm review:workflows -- src/components/Sidebar/index.tsx src/i18n/messages.ts
pnpm review:workflows --workflow accessibility -- src/components/Timer/index.tsx
```
