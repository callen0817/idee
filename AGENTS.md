<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Portable development

- Read `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md` and `docs/INTEGRATIONS.md` before substantial changes. Why: source transfer does not transfer hosting or managed services.
- Preserve TanStack Start file routes and generated integration boundaries; never hand-edit the route tree. Why: route generation and server/client protection depend on these conventions.
- Keep secrets in environment settings and never publish `.env`, personal data or conversation archives. Why: this repository is public and source-only.
- Consult the owner's separate history archive when prior decisions are unclear; update public technical documentation and `roadmap.md` after significant changes. Why: AI context should remain portable without exposing private conversations.
- Keep Cloud auth, storage and database connections unchanged until replacements are authorized and tested. Why: changing a source repository is not a backend migration.
