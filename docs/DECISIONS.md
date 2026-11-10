# Technical decisions

1. Preserve existing Cloud connections during code transfer; no database replacement or hosting cutover is implicit.
2. Use TanStack Start file-based routing and a client-only pathless auth layout; preserve generated integration boundaries.
3. Keep all public source separate from conversation archives and secrets. GitHub history is not a substitute for the owner's privately retained Lovable history.
4. Keep conceptual metrics visibly labelled, and avoid translating website promises into claims of completed functionality.
5. Export source through a clean, inspected manifest, excluding dependencies, generated build output, repository metadata, environment files, private plans and history.
6. Preserve the target repository's existing branch and contents unless the owner explicitly authorizes a destructive operation.
7. External hosting is a separate task: no runtime URL is rewritten to a GitHub URL.