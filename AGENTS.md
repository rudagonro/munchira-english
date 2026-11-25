# Engineering rules

- Keep the existing React/Vite SPA and React Router architecture; a branding change must not become a framework migration.
- Keep the existing GitHub, Vercel and Supabase deployment and data projects; preserving them avoids duplicating users and losing progress.
- Make branding-only changes in presentation and documentation; do not modify migrations, grading, roles, storage identifiers or authentication behavior without a separate request.
- Read README.md, CLAUDE.md and MUNCHIRA_NEXT_STEPS.md before continuing work; they distinguish current decisions, audited content, historical reports and unverified deployment tasks.
- Preserve real contact addresses and historical infrastructure identifiers until a confirmed replacement exists; invented replacements break support and integrations.
- Verify code changes with relevant existing tests and separately verify the deployed app; a repository commit is not evidence of a successful deployment.
- Never commit credentials, test passwords, access tokens or private keys; use the existing hosting and backend secret configuration.
- Serve branding artwork from public/brand and load isolated brand styles after the existing stylesheet; this keeps the Vercel app independent from Lovable and avoids changing course presentation or behavior.
- Keep the public home at / separate from /login and protected learning routes, with scoped public-home styles and a standalone sample exercise; this lets visitors explore without changing student data or authentication.
- Keep shared editorial UI, safe Markdown rendering and route metadata in src/public with isolated public-site.css; this expands public pages without changing student screens or global styles.
- Read editorial Markdown through the simple frontmatter contract in PUBLIC_BLOG.md and exclude *.example.md at import time in production; this preserves authored content and prevents unapproved examples from shipping.
- Deliver public sections in review-only branches and small pull requests; the owner approves before merging or publishing, and Claude owns editorial content, static generation, sitemap and robots.
- Keep optional public grammar exercises in slug-matched JSON companions, excluding example companions from production imports; this separates authored practice from page presentation without storing student data.

- Keep approved public photography and mascot media in immutable asset pointers, resolved against their media-serving origin; use scoped home-media styles and a single entry animation disabled by prefers-reduced-motion to preserve learning screens and accessibility.

- Keep the public header mascot and wordmark in the shared src/public/HeaderBrand component with scoped header-brand.css; one lockup prevents home, blog and grammar branding from drifting.

- Keep stacked public closing-section and footer branding in src/public/FooterBrand with scoped footer-brand.css; sharing the transparent mascot above the wordmark prevents bottom-of-page artwork from diverging.

- Public login uses a native modal side panel and React Router backgroundLocation, reusing the existing Login form without changing auth services; /login remains directly reachable with the public home behind it, preserving protected-route return destinations.

- Keep the review-only step-by-step lesson model in src/public/ModelLesson with pure rules in src/public/model-lesson.js and data in src/data/modelLessons; it validates the lesson format publicly without touching course data, grading or progress.

- Keep registration artwork in a dedicated immutable asset pointer and rga-prefixed styles in register-art.css; this prevents registration restyles from changing shared course images or authentication logic.
- Keep free-presentation checks browser-local in the model-lesson pure rules and label their A1-only scope; this avoids transmitting student text or falsely certifying arbitrary grammar and proper-name spelling.
- Keep the thematic curriculum in src/data/curriculum.json, with original owner documents in content/curriculum/sources and exact references to unchanged source lessons; this separates planned units from published database modules without fabricating progress or replacing student identifiers.
- Course syllabus routes and the student outline share pure curriculum rules; only an explicitly linked sample is playable until complete units have been authored, reviewed and safely integrated.
