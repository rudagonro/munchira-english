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

- Keep approved public photography and mascot media as checked-in public/media files with local URL descriptors; use scoped home-media styles and a single entry animation disabled by prefers-reduced-motion to preserve learning screens and accessibility.

- Keep the public header mascot and wordmark in the shared src/public/HeaderBrand component with scoped header-brand.css; one lockup prevents home, blog and grammar branding from drifting.

- Keep stacked public closing-section and footer branding in src/public/FooterBrand with scoped footer-brand.css; sharing the transparent mascot above the wordmark prevents bottom-of-page artwork from diverging.

- Public login uses a native modal side panel and React Router backgroundLocation, reusing the existing Login form without changing auth services; /login remains directly reachable with the public home behind it, preserving protected-route return destinations.

- Keep shared lesson navigation and completion rules in src/public/lessonProgress.js, separate from answer normalization; callbacks from completed activities unlock the next step and mounted visited panels preserve unfinished work while navigating.
- Keep the step-by-step A1 player in src/public/ModelLesson with pure teaching rules in src/public/model-lesson.js and repository-owned lesson data; separate private drafts from authoritative grades and completion.

- Keep registration artwork in a dedicated immutable asset pointer and rga-prefixed styles in register-art.css; this prevents registration restyles from changing shared course images or authentication logic.
- Keep free-presentation checking in the model-lesson pure rules and label its A1-only scope; draft text syncs only to the existing account backend, never an AI provider.
- Keep the thematic curriculum in src/data/curriculum.json, with original owner documents in content/curriculum/sources and exact references to unchanged source lessons; this separates planned units from published database modules without fabricating progress or replacing student identifiers.
- Course syllabus routes and the student outline share pure curriculum rules; A1 unit progress uses its own authenticated RPC and table so old module identifiers, scores and enrollments stay untouched.
- Keep authoritative A1 units in content/cycles/A1.json and MP3s in public/audio/a1; local descriptors remove runtime CDN and AI dependencies.
- Reuse ModelLesson with a lesson prop and gender-aware audio sprites; shared retry controls and timed clips preserve the approved teaching experience without duplicating screens.
- ModelLesson renders reading segments separately from speaker labels and resolves audio by exact voice plus accent; checked-in offline voice corrections prevent male turns from silently using legacy female clips.

- Never run generic seed_cycle/seed_module imports for repository-only A1; the eight local units are not replacements for the four legacy database modules.
- A1 quiz grading lives in the additive progress RPC with explicit grants and owner-only RLS; update its answer-key migration alongside curriculum quizzes to prevent frontend/server drift.
- Keep repository A1 vocabulary in a separate catalog and owner-scoped review table, merged by get_due_vocab; this reuses the existing Repaso screen without changing legacy vocabulary identifiers or settled progress.
- A1 shadowing uses local MediaRecorder playback, not cloud speech recognition; self-comparison must not be presented as automatic pronunciation scoring.

- Render module theory and practice through the shared safe LessonText formatter; separating authored steps, examples and notes preserves course content and grading while improving readability across levels.

- Derive module lesson counters and resume targets from owner-filtered lesson_progress through moduleLessonProgress; pending quizzes resume directly without treating partial study as module approval.

- A1 unfinished work uses the shared draft context and additive owner-only draft RPC; revision checks prevent stale-device overwrites while account-scoped local outboxes retry unsent changes, without changing grading or A2–C2.
- Restore unit drafts through lessonDraftProgress and legacy module positions through moduleDraftProgress; remembered positions must respect required practice and authoritative lesson completion, including older drafts without completion lists.

- Resolve fixed Unit 1 grammar clips from the dedicated unit1Theory manifest before legacy recordings; exact text, voice alias and accent lookup keeps both accents local without changing dialogue voices.

- Resolve fixed Unit 2–8 grammar clips from the units2to8Theory manifest after corrections and the unit's own recordings; per-unit folders and exact text, voice alias and accent lookup fill only unrecorded theory phrases, so existing unit sprites and dialogue voices never change.
- Old A1 module work only recognises unit theory (legacyUnitCredit); a unit is completed solely by its own server-graded quiz (>=70) in a1_unit_progress, so displayed progress is always real and old rows are read, never rewritten.

- A1 Unidad 0 (content/a1/unit0.json) vive fuera de A1.json y abre la Unidad 1; nunca bloquees a quien ya tiene avance A1 ni por un fallo de lectura. Reutiliza content/a1/card-bank.json con index estables (nunca los cambies) e ilustraciones locales con su atribución CC BY.
