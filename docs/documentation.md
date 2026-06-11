# Documentation Guidelines

For project/setup context, start with the [README](../README.md).

## Goal

Project documentation should help contributors understand:

- what user or operator problem a part of the system solves
- what outcome or constraint must be preserved
- which implementation details are current choices rather than permanent requirements

Documentation should make it harder to over-engineer the product by accident.

## Default Structure

When adding or revising a doc, prefer this order:

1. State the goal or product contract first.
2. Name the user-visible or operator-visible outcomes that matter.
3. List the invariants, risks, or trust boundaries that must hold.
4. Only then describe the current implementation choice, if that detail is needed.
5. Link to code or workflow files for exact mechanics instead of duplicating them in prose.

## Writing Rules

- Lead with the reason, not the mechanism.
- Describe implementation details as current decisions, not as product goals, unless the technology itself is part of the contract.
- Prefer language such as `must`, `should`, and `current implementation` to distinguish hard requirements from replaceable choices.
- Keep docs at the level of contracts, behavior, and operating procedure. Leave exact commands, wiring, and schemas to the code or executable workflow files when possible.
- When a technical choice exists to serve a user benefit, name the benefit explicitly.
- If a section cannot explain who benefits from added complexity, simplify the section or question the complexity.

## Good Patterns

- `Users need a readonly link that cannot take control of the timer.` Then describe how the current routing and permissions enforce that.
- `Operators need a deployment they can verify and roll back quickly.` Then describe the current hosting stack and verification steps.
- `Contributors need the smallest useful validation lane first.` Then describe `scope.yaml` and the agent commands.

## Patterns To Avoid

- Starting a doc with the current framework, transport, or hosting vendor before explaining the outcome it serves.
- Describing one implementation path as inevitable when the real requirement is a user-facing behavior or trust boundary.
- Copying exact workflow wiring, env vars, or code structure into prose when the code already acts as the source of truth.
- Expanding a doc with internal mechanism notes that do not change contributor decisions.

## Update Expectations

- When behavior changes, update the goal or contract first if needed, then adjust the implementation notes.
- When replacing a technical solution without changing the user benefit, prefer updating only the implementation section and linked source files.
- If a doc repeatedly needs exception-heavy implementation notes, split the stable goal from the volatile mechanics.
