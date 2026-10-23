# NIVELO DEVELOPMENT ROADMAP
_Generated: 2026-07-15_

---

## Guiding Principles

1. **No rebuild** — evolve the existing architecture
2. **Working → tested → next** — each phase must be stable before starting the next
3. **Content and code in parallel** — A2–C2 content can be added while features are built
4. **Cache first** — never regenerate what can be reused
5. **AI at the edges** — AI enhances, never replaces structured content

---

## PHASE 0 — Stabilize A1 (Current)
_Goal: A1 is fully functional end-to-end_

- [x] Grammar module (5 lessons, clean practice, theory tables)
- [x] Vocabulary module (vocab_items stage)
- [x] Listening module (TTS via Edge Function)
- [x] Writing module
- [x] Checkpoints after each module
- [x] Quiz feedback with per-question review
- [x] Auto-advance to next cycle
- [ ] Verify all 4 A1 modules end-to-end in browser
- [ ] Fix Listening: add `audio_text` column to replace regex heuristic
- [ ] Upgrade TTS to multi-voice dialogue (nova + onyx alternating)

**Milestone:** Student completes all A1 modules, passes final checkpoint, advances to A2 automatically.

---

## PHASE 1 — Multi-Voice Audio + Audio Cache
_Goal: Listening modules use natural dialogue audio, not single-voice monologue_

**Why first:** Audio quality is the most visible gap; it affects every listening lesson across all 6 levels. Solving it now prevents rework later.

### Tasks:
1. Add `dialogue_turns` (jsonb) and `audio_url` (text) columns to `lessons`
2. Add `audio_text` (text) column to `lessons` (replaces regex heuristic)
3. Update Edge Function `tts-generate` to accept array of turns `[{voice, text}]`
4. Generate audio clips per turn, concatenate or play sequentially in frontend
5. Create Supabase Storage bucket `audio-cache`
6. Update Edge Function to check Storage before calling OpenAI
7. Update `ModuleView.jsx` to play multi-turn audio with pauses
8. Populate A1 Listening lessons with proper `dialogue_turns`

**DB changes:** `lessons.audio_text`, `lessons.dialogue_turns`, `lessons.audio_url`
**Files:** `tts-generate/index.ts`, `ModuleView.jsx`, `AuthContext.jsx`

---

## PHASE 2 — A2–C2 Content Population
_Goal: All 6 CEFR levels have at least 4 modules with content_

**Why second:** The learning engine already works. Content is the bottleneck.

### Tasks per level (A2 first, then B1, B2, C1, C2):
1. Create 4 modules per cycle: Grammar, Vocabulary, Listening, Writing
2. Each module: 4–5 lessons + 5 quiz questions + checkpoint
3. Vocabulary modules: populate `vocab_items`
4. Listening modules: write `dialogue_turns` with real dialogues
5. Grammar modules: include `theory_table` for conjugation/structure tables

**Content themes by level:**
- A2: Daily routines, shopping, travel, family, time
- B1: Work, health, opinions, past events, future plans
- B2: Current events, abstract ideas, professional contexts
- C1: Academic writing, idiomatic expressions, complex arguments
- C2: Native-level texts, nuance, advanced register

---

## PHASE 3 — Speech to Text + Pronunciation
_Goal: Students can speak into the microphone and receive feedback_

### Tasks:
1. Create Edge Function `stt-transcribe` (OpenAI Whisper)
2. Build `SpeakingExercise` component: record → transcribe → compare → feedback
3. Build `PronunciationExercise` component: listen → repeat → word-diff feedback
4. Add `skill_type: 'speaking'` and `skill_type: 'pronunciation'` to modules
5. Update `ModuleView.jsx` to handle new stage types
6. String diff algorithm for "expected vs transcribed" comparison

**New Edge Function:** `stt-transcribe`
**New components:** `SpeakingExercise.jsx`, `PronunciationExercise.jsx`
**Files modified:** `ModuleView.jsx`, `AuthContext.getModuleContent()`

---

## PHASE 4 — AI Conversation Mode
_Goal: Students have structured role-play conversations with AI_

### Tasks:
1. Create Edge Function `ai-conversation` (GPT-4o-mini)
   - System prompt includes: CEFR level, unit vocabulary, grammar targets, scenario, AI role
   - AI responds only with vocabulary appropriate for level
2. Build `ConversationView.jsx` page
3. Define scenario schema in DB (`scenarios` table: context, student_role, ai_role, vocabulary, grammar_targets, difficulty)
4. Populate initial scenarios: Hotel, Restaurant, Airport, Doctor, Shopping
5. Student can type OR speak (uses STT from Phase 3)
6. Conversation history stored in `conversations` + `conversation_messages`
7. Add route `/conversation/:scenarioId`

**New Edge Function:** `ai-conversation`
**New tables:** `scenarios`, `conversations`, `conversation_messages`
**New page:** `ConversationView.jsx`

---

## PHASE 5 — Progress Dashboard
_Goal: Students see their progress, strengths, and weak areas_

### Tasks:
1. Build `ProgressDashboard.jsx` page (route `/progress`)
2. Display: current CEFR level, modules completed, vocabulary learned, study streak, skill scores
3. Show "Continue Learning" button pointing to next incomplete module
4. Show "Weak Areas" based on quiz scores by skill_type
5. Add `xp_total` and `current_streak` columns to `profiles`
6. Build `useProgress.js` hook to aggregate progress data
7. Add XP award logic: +10 XP per lesson, +50 per module, +100 per checkpoint

**New page:** `ProgressDashboard.jsx`
**New hook:** `useProgress.js`
**DB changes:** `profiles.xp_total`, `profiles.current_streak`, `profiles.last_activity`

---

## PHASE 6 — Smart Review + Spaced Repetition
_Goal: Students are shown what they need to practice most_

### Tasks:
1. Add `word_progress` table (SM-2 fields: ease_factor, interval, next_review, correct_count, incorrect_count)
2. Add `student_errors` table (user_id, error_type, item_id, created_at)
3. Track quiz answer errors → insert to `student_errors`
4. Build `ReviewEngine` service: select items due for review based on SM-2 schedule
5. Build `SmartReview.jsx` page (route `/review`)
6. Build vocabulary flashcard component: "Ya la sé / No la sé"
7. SM-2 update logic after each flashcard answer

**New tables:** `word_progress`, `student_errors`
**New page:** `SmartReview.jsx`
**New service:** `services/reviewService.js`

---

## PHASE 7 — Admin / Teacher Panel
_Goal: Content can be managed without touching the database directly_

### Tasks:
1. Build full `TeacherPanel.jsx` (route `/teacher`, role-gated)
2. CRUD for: cycles, modules, lessons, vocab_items, quiz_questions, checkpoints
3. Audio generation button per lesson (calls `tts-generate` and stores in Storage)
4. Content draft/publish flow (add `published` boolean to modules)
5. AI-assisted lesson generation (prompt → GPT-4o-mini → draft stored for review)
6. Student progress overview for teacher accounts

**Modified:** `TeacherPanel.jsx`
**New service:** `services/adminService.js`

---

## PHASE 8 — Exercise Types Expansion
_Goal: More varied learning interactions beyond multiple choice_

### Tasks:
1. Build reusable exercise components:
   - `FillBlanks.jsx` — cloze deletion
   - `MatchingPairs.jsx` — word-to-translation drag
   - `WordOrdering.jsx` — unscramble sentence
   - `Dictation.jsx` — audio → type what you hear
   - `TranslationExercise.jsx` — write translation
2. Add `exercise_type` field to `quiz_questions`
3. Update `ModuleView.jsx` quiz stage to render by exercise_type
4. Build `exercises/index.js` registry mapping type → component

**New components:** `src/components/exercises/`
**Modified:** `ModuleView.jsx`, `quiz_questions` table

---

## PHASE 9 — PWA + Offline Mode
_Goal: Students can study key lessons without internet_

### Tasks:
1. Add Vite PWA plugin (`vite-plugin-pwa`)
2. Configure service worker to cache: app shell, current lesson, current module audio
3. IndexedDB for offline lesson data
4. "Download for offline" button in module view
5. Sync progress when back online

---

## Feature Matrix (all phases)

| Feature | Phase | Priority |
|---|---|---|
| Multi-voice dialogue audio | 1 | 🔴 High |
| Audio cache (Storage) | 1 | 🔴 High |
| A2–C2 content | 2 | 🔴 High |
| Speech to Text | 3 | 🟠 Medium |
| Pronunciation feedback | 3 | 🟠 Medium |
| AI Conversation | 4 | 🟠 Medium |
| Role Play scenarios | 4 | 🟠 Medium |
| Progress Dashboard | 5 | 🟠 Medium |
| Gamification (XP/streak) | 5 | 🟡 Low-Medium |
| Spaced Repetition (SM-2) | 6 | 🟠 Medium |
| Smart Review | 6 | 🟠 Medium |
| Teacher/Admin panel | 7 | 🔴 High (for content ops) |
| Exercise types expansion | 8 | 🟡 Low-Medium |
| PWA / Offline | 9 | 🟡 Low |
