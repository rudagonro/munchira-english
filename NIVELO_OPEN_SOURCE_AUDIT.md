# NIVELO OPEN SOURCE AUDIT
_Generated: 2026-07-15_

---

## Repositories Analyzed

### 1. LibreLingo
| Field | Value |
|---|---|
| **Repository** | LibreLingo |
| **GitHub URL** | https://github.com/kantord/LibreLingo |
| **License** | AGPL-3.0 |
| **Last relevant activity** | ARCHIVED June 2026 — no longer maintained |
| **Technology stack** | Svelte, Python, PouchDB, YAML course format |
| **Useful features** | YAML-based course structure, spaced repetition concept, cross-device sync via PouchDB |
| **Potential reusable components** | YAML course schema concept (adapt to JSON/DB); spaced repetition scheduling logic |
| **Integration complexity** | High — Svelte is incompatible with our React stack; Python backend incompatible with Supabase Edge Functions |
| **Compatibility with NIVelo** | Low — different stack, archived, AGPL incompatible with commercial product |
| **License implications** | AGPL-3.0 requires releasing all modifications as open source. Incompatible if NIVelo is a closed/commercial product. Do NOT copy code. |
| **Recommendation** | **REFERENCE** — Conceptual reference for course content structure. Do not use code. |

---

### 2. OpenLingo
| Field | Value |
|---|---|
| **Repository** | OpenLingo |
| **GitHub URL** | https://github.com/pretzelai/openlingo |
| **License** | MIT |
| **Last relevant activity** | Actively developed (191 commits, 40 stars) |
| **Technology stack** | Next.js 16, React 19, TypeScript, PostgreSQL, Drizzle ORM, OpenAI (TTS + Whisper), Cloudflare R2, Tailwind CSS |
| **Useful features** | Multi-voice TTS, Whisper STT, SM-2 spaced repetition, AI tutor (GPT-4o-mini), 9 exercise types, audio caching in R2, CEFR classification, 15+ languages |
| **Potential reusable components** | SM-2 algorithm implementation, TTSProvider pattern, STT transcription pattern, AI conversation system prompt design, exercise component architecture |
| **Integration complexity** | Medium — different framework (Next.js vs React+Vite) but same language (JS/React), same AI provider (OpenAI), similar DB pattern (PostgreSQL) |
| **Compatibility with NIVelo** | High — same AI provider, same frontend language, same database paradigm. Patterns directly applicable. |
| **License implications** | MIT — permissive. Can read, adapt, and reimplement patterns. Attribution appreciated but not required. Can use in commercial product. |
| **Recommendation** | **ADAPT** — Primary reference for audio architecture, SM-2 SRS, STT integration, and AI conversation system. Reimplement patterns (not copy code) to fit Supabase Edge Functions instead of Next.js API routes. |

**Specific patterns to adapt from OpenLingo:**
- SM-2 algorithm logic (adapt to `word_progress` table)
- `TTSProvider` abstraction interface
- Audio caching strategy (swap Cloudflare R2 → Supabase Storage)
- AI conversation system prompt structure with CEFR constraints
- Speaking exercise flow (record → Whisper → compare)

---

### 3. LinguaCafe
| Field | Value |
|---|---|
| **Repository** | LinguaCafe |
| **GitHub URL** | https://github.com/simjanos-dev/linguacafe |
| **License** | GPL-3.0 |
| **Last relevant activity** | Actively maintained (1,079 commits, 176 open issues) |
| **Technology stack** | Laravel (PHP), Vue.js, Docker, Spacy (NLP), Anki integration |
| **Useful features** | Reading-based vocabulary acquisition, flashcard spaced repetition, vocabulary tracking per word, 27 languages, dictionary integration |
| **Potential reusable components** | Vocabulary tracking data model, flashcard UI pattern, reading comprehension flow |
| **Integration complexity** | Very High — PHP/Vue vs React/Supabase; completely different stack |
| **Compatibility with NIVelo** | Low — tech stack incompatible; self-hosted single-user app vs multi-tenant SaaS |
| **License implications** | GPL-3.0 (copyleft) — any code derived from GPL must also be GPL. **Do NOT copy code** if NIVelo is commercial or closed source. Use only as conceptual reference. |
| **Recommendation** | **REFERENCE** — Study vocabulary tracking data model and flashcard UX patterns. Do not use any code. |

---

### 4. LUTE v3
| Field | Value |
|---|---|
| **Repository** | LUTE v3 |
| **GitHub URL** | https://github.com/LuteOrg/lute-v3 |
| **License** | MIT |
| **Last relevant activity** | Very active (2,342 commits on develop, 1.5k stars, Discord community) |
| **Technology stack** | Python/Flask, web-based, pytest, Docker |
| **Useful features** | Reading-based learning, vocabulary management per word, spaced repetition, TTS integration, progress tracking |
| **Potential reusable components** | Vocabulary status model (new/learning/known), reading text annotation concept, word-level progress tracking |
| **Integration complexity** | High — Python/Flask vs React/Supabase; backend incompatible |
| **Compatibility with NIVelo** | Medium — MIT license is compatible; vocabulary tracking concepts directly applicable to `word_progress` table design |
| **License implications** | MIT — permissive. Can study and adapt patterns freely, including in commercial products. |
| **Recommendation** | **REFERENCE** — Vocabulary status model (5 states: new/learning/familiar/known/ignored) is excellent reference for `word_progress` table design. Do not port backend code. |

---

## Additional Repositories Worth Monitoring

| Repository | License | Relevant feature | Recommendation |
|---|---|---|---|
| `Anki` (ankitects/anki) | AGPL-3.0 | SM-2 algorithm origin; flashcard engine | REFERENCE only (AGPL) |
| `ts-fsrs` (open-spaced-repetition/ts-fsrs) | MIT | TypeScript SM-2/FSRS implementation | **USE** — npm package, MIT, drop-in SRS logic |
| `react-speech-recognition` (JamesBrill) | MIT | Web Speech API wrapper for React | **EVALUATE** — free STT fallback before Whisper |
| `wavesurfer.js` (katspaugh) | BSD-3 | Audio waveform visualization for listening exercises | **USE** — lightweight, MIT-compatible |

---

## Feature Matrix

| NIVelo Feature | Existing NIVelo Implementation | Open Source Reference | Recommended Action |
|---|---|---|---|
| CEFR diagnostic | ✅ Full (4 blocks, adaptive) | None comparable | **KEEP** |
| Module unlock logic | ✅ Full (checkpoints, sequential) | None comparable | **KEEP** |
| Vocabulary stage | ✅ Partial (display only) | LinguaCafe, LUTE | **ADAPT** — add audio per word |
| Multiple choice quiz | ✅ Working | OpenLingo | **KEEP** |
| TTS audio (single voice) | ✅ Working (tts-1-hd) | OpenLingo | **ADAPT** — multi-voice + cache |
| Multi-voice dialogue | ❌ Missing | OpenLingo | **BUILD** (Phase 1) |
| Audio cache | ❌ Missing | OpenLingo (R2) | **BUILD** — Supabase Storage (Phase 1) |
| Speech to Text | ❌ Missing | OpenLingo (Whisper) | **ADAPT** pattern → Edge Function (Phase 3) |
| Pronunciation feedback | ❌ Missing | OpenLingo | **BUILD** — string diff + Whisper (Phase 3) |
| AI Conversation | ❌ Missing | OpenLingo | **ADAPT** prompt patterns (Phase 4) |
| Role Play scenarios | ❌ Missing | OpenLingo | **BUILD** (Phase 4) |
| Spaced Repetition (SM-2) | ❌ Missing | OpenLingo, ts-fsrs | **USE** ts-fsrs package (Phase 6) |
| Vocabulary flashcards | ❌ Missing | LinguaCafe, LUTE | **BUILD** (Phase 6) |
| Smart Review | ❌ Missing | OpenLingo | **ADAPT** (Phase 6) |
| Progress Dashboard | ❌ Missing | OpenLingo | **BUILD** (Phase 5) |
| Gamification (XP/streak) | ❌ Missing | LibreLingo concept | **BUILD** (Phase 5) |
| Exercise types (fill/match/order) | ❌ Missing | OpenLingo (9 types) | **REFERENCE** architecture (Phase 8) |
| Admin content panel | ⚠️ Placeholder | None directly | **BUILD** (Phase 7) |
| PWA / Offline | ❌ Missing | LibreLingo (PouchDB concept) | **BUILD** (Phase 9) |
| Interactive reading | ❌ Missing | LinguaCafe, LUTE | **REFERENCE** for future |
| AI exercise generation | ❌ Missing | OpenLingo | **ADAPT** for admin panel (Phase 7) |

---

## License Summary

| Repository | License | Can use code? | Can use patterns/ideas? |
|---|---|---|---|
| LibreLingo | AGPL-3.0 | ❌ No (copyleft + archived) | ✅ Yes |
| OpenLingo | MIT | ✅ Yes (with attribution) | ✅ Yes |
| LinguaCafe | GPL-3.0 | ❌ No (strong copyleft) | ✅ Yes |
| LUTE v3 | MIT | ✅ Yes (with attribution) | ✅ Yes |
| ts-fsrs | MIT | ✅ Yes — npm install | ✅ Yes |
| wavesurfer.js | BSD-3 | ✅ Yes — npm install | ✅ Yes |

---

## Key Recommendations Summary

1. **OpenLingo is the primary reference** — MIT license, same AI stack (OpenAI), active development. Adapt its TTS multi-voice pattern, audio cache strategy, SM-2 implementation, and AI conversation architecture. Reimplement in our Supabase Edge Function style, do not copy code directly.

2. **Use `ts-fsrs` npm package** for spaced repetition — MIT, TypeScript-native, implements SM-2 and FSRS algorithms. No need to build from scratch.

3. **LinguaCafe and LibreLingo** — conceptual reference only. Do not use their code.

4. **LUTE vocabulary status model** (new/learning/familiar/known) is a well-tested UX pattern worth adapting for NIVelo's flashcard system.

5. **NIVelo's core (diagnostic, module unlock, CEFR structure, Supabase integration)** has no comparable open source equivalent — it is original and should be preserved as our competitive advantage.
