# Features

## Implemented source

- Public pages with reusable navigation, footer, concept labels and per-page metadata.
- Phone and wearable concept frames, Circle network, Today view, Living Map and demo profile.
- Heat state styling and participation examples.
- Audience-aware early-access form with consent and campaign/referral capture.
- Email/password and managed Google sign-in UI.
- Client-gated `/my` account shell and sign-out control.

## Verification boundaries

Public routes were exercised in the local preview. Mobile navigation was exercised. Signed-out `/my` redirected to sign-in. This does not verify successful authentication, database insert/readback or production deployment.

Cloud access was unavailable during the initial migration audit, so authenticated checks and real early-access persistence remain incomplete. No operational social network, live map, wearable integration, payment flow, guardian control or progression engine is claimed.