# NIVELO DEVELOPMENT AUDIT
_Generated: 2026-07-15_

---

## 1. CURRENT ARCHITECTURE

**Stack:**
- React 19 + Vite 8 (frontend SPA)
- React Router v7 (client-side routing with protected routes)
- Supabase (Auth + PostgreSQL + RLS + Edge Functions)
- Plain CSS (no framework — custom navy/amber design system)
- OpenAI TTS via Supabase Edge Function `tts-generate` (tts-1-hd model)

**Deployment model:** Local dev only (localhost:5173). No production deploy yet.

**Database:** 11 tables with RLS enabled:
`profiles`, `diagnostics`, `cycles`, `modules`, `lessons`, `quiz_questions`,
`checkpoints`, `enrollments`, `module_progress`, `checkpoint_attempts`, `teacher_students`, `vocab_items`

**Edge Functions:** `tts-generate` — OpenAI TTS proxy (verify_jwt=true, OPENAI_API_KEY as secret)

---

## 2. EXISTING FEATURES

| Feature | Status | Location |
|---|---|---|
| User registration (always student role) | ✅ Working | `Register.jsx`, DB trigger `handle_new_user` |
| Email + Google OAuth login | ✅ Working | `Login.jsx`, `AuthContext.jsx` |
| Adaptive CEFR diagnostic (A1–C2) | ✅ Working | `Diagnostic.jsx`, `useDiagnostic.js`, `diagnosticBank.js` |
| Auto-enrollment after diagnostic | ✅ Working | `AuthContext.saveDiagnosticResult()` |
| Cycle/module navigation with unlock logic | ✅ Working | `CycleModules.jsx`, `moduleAvailability.js` |
| Sequential module unlock + checkpoint gates | ✅ Working | `computeModuleAvailability()` |
| Vocabulary stage (vocab_items) | ✅ Working | `ModuleView.jsx` stage='vocab' |
| Lesson viewer (theory + practice) | ✅ Working | `ModuleView.jsx` stage='lessons' |
| Theory tables (theory_table jsonb) | ✅ Working | `ModuleView.jsx` table render |
| TTS audio in Listening modules | ✅ Working | `playLessonAudio()`, `tts-generate` Edge Function |
| Module quiz (multiple choice) | ✅ Working | `ModuleView.jsx` stage='quiz' |
| Quiz result with per-question feedback | ✅ Working | `ModuleView.jsx` stage='result' |
| Checkpoint evaluation after quiz | ✅ Working | `submitCheckpointAttempt()` |
| Auto-advance to next CEFR cycle | ✅ Working | `advanceToNextCycle()` |
| Role-based route protection | ✅ Working | `ProtectedRoute.jsx` |
| Empty cycle state (no false "Felicidades") | ✅ Fixed | `isCycleComplete()` |
| A1 Grammar content (5 lessons) | ✅ Content | DB |
| A1 Vocabulary module | ✅ Content | DB |
| A1 Listening module (3 lessons) | ✅ Content | DB |
| A1 Writing module | ✅ Content | DB |
| Teacher panel | ⚠️ Placeholder | `TeacherPanel.jsx` |
| Speaking Lab / STT | ❌ Missing | — |
| Spaced repetition | ❌ Missing | — |
| AI Conversation | ❌ Missing | — |
| Student progress dashboard | ❌ Missing | — |
| Gamification (XP, streaks) | ❌ Missing | — |
| Smart Review mode | ❌ Missing | — |
| A2–C2 content | ❌ Missing | DB cycles exist, no modules |
| Admin content panel | ❌ Missing | — |
| PWA / offline mode | ❌ Missing | — |
| Audio cache (Supabase Storage) | ❌ Missing | — |
| Error tracking per student | ❌ Missing | — |

---

## 3. MISSING FEATURES (by document priority)

### High Priority
1. **Listening with AI dialogue audio** — multi-voice conversations (nova/onyx alternating), not single-voice monologue
2. **Speech to Text (STT)** — OpenAI Whisper via Edge Function for speaking exercises
3. **Pronunciation module** — listen → repeat → compare → feedback
4. **A2–C2 content** — cycles exist in DB, modules/lessons/quizzes missing

### Medium Priority
5. **AI Conversation mode** — GPT-4o-mini as AI interlocutor, CEFR-constrained vocabulary
6. **Role Play scenarios** — Hotel, Airport, Restaurant, etc. with structured context
7. **Progress Dashboard** — skill scores, streak, vocabulary count, weak areas
8. **Smart Review** — auto-built sessions based on error history
9. **Spaced Repetition (SM-2)** — for vocabulary and grammar items
10. **Admin content panel** — CRUD for cycles/modules/lessons/vocab/quizzes

### Lower Priority
11. **Gamification** — XP, streaks, achievements, daily goals
12. **Error tracking** — per-student error log for personalization
13. **Exercise type expansion** — fill-in-blanks, matching, word ordering, dictation
14. **PWA / offline** — service worker, cached lessons
15. **Audio cache** — Supabase Storage + hash-based lookup

---

## 4. REUSABLE COMPONENTS (currently existing)

| Component | Reuse potential |
|---|---|
| `ProtectedRoute.jsx` | Already generic — keep as-is |
| `moduleAvailability.js` (pure functions) | Excellent — no side effects, fully testable |
| `useDiagnostic.js` | Reusable hook pattern — good template for other complex flows |
| `AuthContext.jsx` | Functional but growing too large — candidate for splitting |
| TTS Edge Function `tts-generate` | Extend to multi-voice instead of replacing |

---

## 5. TECHNICAL DEBT

| Issue | Severity | Description |
|---|---|---|
| All DB queries in AuthContext | Medium | `AuthContext.jsx` is 330 lines and doubles as a service layer. Should eventually split into `services/` folder as the app grows. |
| No service abstraction for TTS | Medium | TTS logic is hardcoded to OpenAI in the Edge Function. Should implement TTSProvider pattern for swappability. |
| `extractListeningText()` heuristic | Low | Parses practice_content with regex to find audio text. Fragile — better to add a dedicated `audio_text` column to lessons. |
| No error boundary | Low | React errors crash the full app with no recovery UI. |
| No loading skeletons | Low | Plain text "Cargando..." — no skeleton screens. |
| No test suite | Low | Zero tests currently. |
| TeacherPanel is a stub | High | Placeholder — blocks teacher/admin workflow. |

---

## 6. RECOMMENDED ARCHITECTURE (evolutionary, not rebuild)

```
src/
├── components/          # Shared UI components (expand here)
│   ├── ProtectedRoute.jsx
│   ├── exercises/       # NEW: ExerciseMultipleChoice, FillBlanks, Matching, etc.
│   └── ui/              # NEW: Button, Card, Badge, ProgressBar
├── contexts/
│   └── AuthContext.jsx  # Keep — but extract DB calls to services/
├── data/
│   ├── diagnosticBank.js
│   └── moduleAvailability.js
├── hooks/
│   ├── useDiagnostic.js
│   └── useProgress.js   # NEW: streak, XP, skill scores
├── lib/
│   └── supabase.js
├── pages/               # Keep existing pages
│   └── ...
├── services/            # NEW: extracted from AuthContext
│   ├── moduleService.js
│   ├── progressService.js
│   ├── reviewService.js
│   └── ttsService.js    # TTSProvider abstraction
└── index.css
```

**Supabase Edge Functions to add:**
- `stt-transcribe` — OpenAI Whisper proxy
- `ai-conversation` — GPT-4o-mini conversation engine
- `audio-cache-check` — hash lookup + Supabase Storage

**New DB tables needed:**
- `word_progress` — spaced repetition tracking (SM-2 fields)
- `student_errors` — per-student error log
- `conversations` — AI conversation sessions
- `conversation_messages` — individual turns

---

## 7. OPEN SOURCE REFERENCES

See `NIVELO_OPEN_SOURCE_AUDIT.md` for full analysis.

**Summary of most useful references:**
- **OpenLingo (MIT)** — closest match to NIVelo's vision; multi-voice TTS, Whisper STT, SM-2 SRS, AI tutor. Architecture patterns directly applicable.
- **LUTE (MIT)** — vocabulary tracking patterns and reading comprehension approach.
- **LibreLingo** — ARCHIVED. Conceptual reference only for exercise structure (AGPL + archived).
- **LinguaCafe** — GPL-3.0 (copyleft). Reference only; no code reuse for commercial product.

---

## 8. AI INTEGRATION OPPORTUNITIES

| Use case | Model | Trigger | Cache strategy |
|---|---|---|---|
| TTS (listening audio) | OpenAI tts-1-hd | Pre-generated per lesson | Hash(text+voice+speed) → Supabase Storage |
| Multi-voice dialogue | OpenAI tts-1-hd (nova+onyx) | Pre-generated | Same hash strategy |
| STT (speaking exercises) | OpenAI Whisper | On user mic input | None (per-attempt) |
| AI Conversation | GPT-4o-mini | On student message | None (dynamic) |
| Exercise generation | GPT-4o-mini | Admin panel only | Store in DB after review |
| Writing correction | GPT-4o-mini | On student submission | Per-submission |
| Pronunciation feedback | Whisper + string diff | On student recording | Per-attempt |

**Rule:** Never generate AI content on page load. Generate once, cache, reuse.

---

## 9. AUDIO ARCHITECTURE

**Current state:** Single-voice TTS (OpenAI nova) called on-demand. No cache.

**Target architecture:**
```
Lesson audio request
  → Check Supabase Storage (hash key)
    → Found: return URL directly
    → Not found:
        → Call tts-generate Edge Function
        → Store MP3 in Supabase Storage
        → Return URL
```

**Multi-voice dialogue format (new DB column `dialogue_turns`):**
```json
[
  { "speaker": "receptionist", "voice": "onyx", "text": "Good evening. Welcome to the Grand Hotel." },
  { "speaker": "guest", "voice": "nova", "text": "Hi. I have a reservation under González." }
]
```
Each turn generates a separate audio file; frontend plays them sequentially with natural pauses.

---

## 10. DATABASE CHANGES NEEDED

| Table | Change | Reason |
|---|---|---|
| `lessons` | Add `audio_text` (text) | Replace heuristic regex parser |
| `lessons` | Add `dialogue_turns` (jsonb) | Multi-voice listening dialogues |
| `lessons` | Add `audio_url` (text) | Cached pre-generated audio URL |
| `vocab_items` | Add `audio_url` (text) | Word-level TTS cache |
| NEW: `word_progress` | SM-2 fields per user per word | Spaced repetition |
| NEW: `student_errors` | error_type, item_id, user_id, created_at | Error tracking |
| NEW: `conversations` | scenario, cefr_level, user_id, started_at | AI conversation sessions |
| NEW: `conversation_messages` | conversation_id, role, content, created_at | Dialogue turns |

---

## 11. SECURITY (current status)

| Check | Status |
|---|---|
| OPENAI_API_KEY never in frontend | ✅ Edge Function secret only |
| Supabase anon key in .env (client-exposed by design) | ✅ Correct (anon key is public by design) |
| RLS enabled on all tables | ✅ Confirmed |
| Role assignment via DB trigger only | ✅ `handle_new_user` trigger |
| No role selector in registration form | ✅ Confirmed |
| Edge Functions require valid JWT | ✅ `verify_jwt: true` |
| Rate limiting on AI endpoints | ❌ Missing — needed before public launch |

---

## 12. COST CONSIDERATIONS

| Service | Current cost | Risk | Mitigation |
|---|---|---|---|
| OpenAI TTS (tts-1-hd) | ~$30/1M chars | Medium — called per-student per-session | Audio cache in Supabase Storage |
| OpenAI Whisper | $0.006/min | Low — only when student speaks | Per-attempt, no cache needed |
| GPT-4o-mini (AI conversation) | ~$0.15/1M input tokens | Medium — conversational loops | Token limits per session |
| Supabase (Free tier) | $0 now | Low — limited to 500MB DB, 1GB Storage | Upgrade when needed |
| Supabase Edge Function invocations | Free tier: 500k/month | Low | Acceptable for early stage |
