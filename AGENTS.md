# Engineering rules

- Keep the existing React/Vite SPA and React Router architecture; a branding change must not become a framework migration.
- Keep the existing GitHub, Vercel and Supabase deployment and data projects; preserving them avoids duplicating users and losing progress.
- Make branding-only changes in presentation and documentation; do not modify migrations, grading, roles, storage identifiers or authentication behavior without a separate request.
- Read README.md and CLAUDE.md before continuing work; they distinguish current decisions, historical reports and unverified deployment tasks.
- Preserve real contact addresses and historical infrastructure identifiers until a confirmed replacement exists; invented replacements break support and integrations.
- Verify code changes with relevant existing tests and separately verify the deployed app; a repository commit is not evidence of a successful deployment.
- Never commit credentials, test passwords, access tokens or private keys; use the existing hosting and backend secret configuration.
