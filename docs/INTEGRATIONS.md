# Integrations and portability

| Integration | Current use | Migration handling |
| --- | --- | --- |
| Lovable Cloud | Existing early-access database and authentication | Preserve current backend and data. Source transfer does not transfer infrastructure. |
| Managed Google auth | `@lovable.dev/cloud-auth-js` and generated auth wrapper | Remains dependent on managed auth. A new origin needs an authorized, tested auth configuration before cutover. |
| Email/password auth | Generated browser client | Preserve existing accounts. Hosted settings and real login are not yet verified in this migration. |
| Preview session storage | Generated preview broker | Keep generated fallback behavior; do not replace without testing regular browser and preview sessions. |
| Lovable Vite configuration | Build plugins, Worker target, environment handling | Package remains part of source. External-host behavior needs independent verification. |
| Google Fonts | Manrope / DM Sans stylesheets in root head | Public font URLs; no repository or hosting URL changes needed. |
| London concept image | Bundled `src/assets/idee-irl-london.jpg` | Included in source export; no external image dependency. |
| Lovable error reporting | Optional browser telemetry hooks and server error wrapper | Preserve; hooks are optional and not an alternative to external monitoring. |
| Payments / Stripe | No checkout, subscription, price, webhook or payment module found in this app | No payment service was migrated, changed or verified. Do not claim Stripe is integrated. |
| AI gateway, external API connectors | No runtime calls found | No live integration migrated. GitHub authorization used for transfer is development-only. |
| Storage, realtime, cron | Generated helper scaffolding only; no active app flows found | No storage/realtime/job operation has been verified. |

## Environment inventory

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`: browser/build public settings for the existing backend. Configure privately on any replacement host.
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`: server configuration for the same backend.
- `SUPABASE_SERVICE_ROLE_KEY`: generated admin helper references this server-only credential, but the current app does not call that helper. Cloud does not expose this credential for export; do not request it or fabricate a value.
- `LOVABLE_CRON_SECRET`, `LOVABLE_CRON_SECRET_PREVIOUS`: unused generated cron helper variables, not current app requirements.
- `GITHUB_PERSONAL_ACCESS_TOKEN`: development authorization only. Never include it in application source, CI, exported `.env`, docs or browser code.

No environment values, backend identifiers or credential values are published in these docs. A GitHub repository URL must never replace an API base URL, an OAuth redirect or a deployment URL.