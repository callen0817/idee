# IDee

Interactive Digital Encounter Engine — the official website and initial web-product foundation for participating in real life.

## Develop

1. Clone this repository and install Bun.
2. Copy `.env.example` to `.env` privately and populate the existing Cloud public settings. Never commit credentials.
3. Run `bun install --frozen-lockfile` and `bun run dev`.
4. Run `bun test` for export-safety tests. CI runs tests and the production build.

Read `AGENTS.md` and `docs/PROJECT_CONTEXT.md` before substantial changes. Architecture, features and integration dependencies are documented under `docs/`.

## One-time handoff, not sync

Source delivery uses a one-time GitHub API commit. It does not enable native Lovable Git sync. Future development and deployment are managed independently from this repository. See `docs/HANDOFF.md` for the hosting, domain, Cloud, auth and secret setup that remains separate.

## Hosting and services

This is a TanStack Start server application, not a static GitHub Pages site. The source retains the existing Lovable Cloud connection and managed sign-in dependencies. Moving source to GitHub does not move hosting, data, accounts, secrets or OAuth settings. No hosting cutover is included.

Configure the six public/server Cloud configuration values from `.env.example` as GitHub Actions repository variables to run CI. The CI workflow validates but does not deploy or apply migrations.

The repository is intentionally public and source-only. Private conversation history is retained separately by the owner. Existing source history is not rewritten; a transfer commit does not preserve the original Lovable git history.

## Product status

Wearable hardware and live product experiences are in development. Concept metrics are demonstrative; the private account area is an early shell, not a finished social-value engine.
