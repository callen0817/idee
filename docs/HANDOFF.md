# Independent development handoff

## Source delivery

The source is handed off to the existing public GitHub repository through a one-time GitHub API commit. This does not enable native Lovable Git sync or create a continuing connection. Existing GitHub history is preserved; only source, assets, migrations, tests and public technical documentation are included. Credentials, environment values, private history, dependencies and generated build output are excluded.

The repository is the owner's development home going forward. GitHub Actions performs source validation only; it does not deploy the website or apply database migrations. A source push is not a hosting or backend cutover.

## What still needs separate setup

| Area | Action required outside this source push |
| --- | --- |
| Website hosting | Choose and authorize a host, configure the build/runtime and deploy a test URL. This is a TanStack Start server application, not static GitHub Pages. The existing build defaults to a Cloudflare-compatible server target. Vercel is a possible alternative only after configuring its target and testing the deployed app; no Vercel-ready deployment is claimed. |
| Domain | Add the domain to the chosen host, update DNS at the domain provider, and verify HTTPS after testing the deployment. No domain or DNS change is made by this handoff. |
| Existing Lovable Cloud | Database, accounts, policies and any stored files remain in the current managed Cloud project; they are not transferred with source. Keeping them means continuing to depend on Lovable Cloud and its billing/administration. Do not delete the current project while the external app still depends on it. Cloud cannot be detached from this project. |
| Full backend independence | Moving away from Cloud requires a separately planned and tested backend migration: schema/policies, application data, accounts, storage, providers and integration behavior. Migration files are not a data or account export. Account/password continuity must be assessed before cutover, not promised. |
| Configuration and secrets | Set the public/build and server configuration from `.env.example` in the new host. Private provider credentials must be obtained/reissued and saved securely on that host, never committed. Lovable does not automatically copy its secret store. Cloud's service-role key and database password are unavailable for export. The current app does not call the privileged admin helper, so do not invent or request a service-role key to deploy the existing flows. |
| Sign-in | Authorize the new site's return URLs in Lovable Cloud: More → Users → Auth settings → Advanced → Redirect URLs, using the actual site's HTTPS origin followed by `/**`; review Site URL for email links. There is no agent tool for editing this redirect list. Managed Google sign-in still uses Lovable's auth helper/broker and must be tested on the new origin. Fully replacing that dependency requires separate provider setup and code changes. |
| Deployment operations | Connect GitHub to the chosen host or configure an independent deploy workflow; set host credentials/permissions, preview and production environments, monitoring, rollback and backup procedures. This can be automated after setup, but none is activated by the source export. Database migrations require their own authorized execution path. |

## Safe cutover order

1. Deploy the repository to a temporary URL on the chosen host with the existing backend configuration.
2. Authorize that origin for sign-in and email return links.
3. Test all public pages, refresh/deep links, a real consented early-access submission, sign-up confirmation, sign-in, `/my` and sign-out.
4. Configure the domain and HTTPS only after these checks pass; retest auth on the final domain.
5. Establish independent GitHub-to-host deployment, monitoring, backups and rollback.
6. If leaving Cloud entirely, migrate and test the replacement backend before removing the original dependency.

## Verification boundaries

The previous source transfer passed GitHub CI's dependency installation, privacy tests and production build. Public-page and early-access checks were performed against the Lovable preview, not an external production host. A signed-in account flow remains unverified pending a created and confirmed account. No external host, domain, secret transfer or backend migration is completed by this handoff.

The account area is still a demo shell. Live discovery, progression, Circle/Bridge engines, guardian controls, payments and wearable hardware require separate product development; source handoff does not make those concepts operational.
