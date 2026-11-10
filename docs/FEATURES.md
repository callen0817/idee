# Features

## Implemented source

- Public pages with reusable navigation, footer, concept labels and per-page metadata.
- Phone and wearable concept frames, Circle network, Today view, Living Map and demo profile.
- Heat state styling and participation examples.
- Audience-aware early-access form with consent and campaign/referral capture.
- Email/password and managed Google sign-in UI.
- Client-gated `/my` account shell and sign-out control.

## Verification boundaries

All public routes were exercised in the local preview. Mobile navigation was exercised, horizontal overflow corrected and the final browser check reported no page errors. Signed-out `/my` redirected to sign-in.

A clearly labelled non-customer early-access entry was submitted through the real form: submission without consent was blocked; with consent the request returned 201 and the UI showed success. An authorized read confirmed the audience, city, source, campaign and consent fields persisted. The verification record remains for owner review.

The GitHub validation workflow passed dependency installation, export-policy tests and production build. All 130 initial transferred source files were matched against GitHub blob hashes.

Cloud was initially unavailable but later responded normally. It has no auth users, so successful sign-in and the authenticated account shell remain unverified until the first account is created and confirmed. No external production deployment has been verified. No operational social network, live map, wearable integration, payment flow, guardian control or progression engine is claimed.