# ProductPush → PM Course Simulator

Replace the scenario engine with a structured **course** built from the ТЗ: 21 lessons, each = теория + 5 заданий (квиз, расчёт, кейс, письменное, звонок) + сводный экран. AI grades open answers, a 3-tier hint system руководит попытками, progress lives in Lovable Cloud. The office laptop becomes a macOS-style desktop with a Calls app that rings when a lesson reaches the звонок step. The post-simulation analytics screen stays (reused for the lesson summary / course progress).

## Phase 0 — Backend foundation (Lovable Cloud)
- Enable Cloud. Auth: email/password + Google sign-in.
- Tables (all with GRANTs + RLS scoped to `auth.uid()`):
  - `profiles` (display name) + trigger on signup.
  - `lesson_progress` — user_id, lesson_id, current_step, status, started/completed_at.
  - `task_attempts` — user_id, lesson_id, task_type, attempt_no, status (`solved_self` / `solved_with_help` / `failed`), user_answer, ai_feedback, score.
  - `user_roles` + `app_role` enum + `has_role()` security-definer (admin gating reused later).
- Course content (21 lessons) ships as a typed data module in code (`src/lib/course/lessons/*`), not a table — fast to author and version. Progress/attempts are the only DB writes.

## Phase 1 — Course data model & content
- New types in `src/lib/course/types.ts`: `Lesson`, `Theory`, and 5 task shapes (`QuizTask`, `CalcTask`, `CaseTask`, `WrittenTask`, `CallTask`) carrying the exact fields the ТЗ lists (question/options/correctIndex, hint L1/L2, explanation; formula + answer + tolerance; criteria checklist; character system prompt + hidden info + reveal condition + open question, etc.).
- Author all 21 lessons from the uploaded ТЗ into `src/lib/course/lessons/`.
- Remove the old `SCENARIOS` engine surface: `simulations.index`, `simulations.$id.*` routes and `scenarios.ts` are replaced by course routes. Keep `OfficeView` + analytics components, adapt them.

## Phase 2 — Lesson runner UI
- Routes: `/course` (lesson list + progress), `/_authenticated/lesson/$id` (runner).
- 5-step progress indicator within a lesson (not a global bar).
- Step screens:
  1. **Теория** — text + key terms.
  2. **Квиз** — single-choice; wrong → L1 hint, retry; 2nd wrong → L2 hint; 3rd → reveal answer + explanation, status `solved_with_help`.
  3. **Расчёт** — numeric/text input with tolerance; same hint ladder.
  4. **Кейс** — multi-select / categorization; same ladder.
  5. **Письменное** — TextArea, AI-graded against criteria checklist; AI returns guiding question per unmet criterion, up to 3 revisions, then reference answer.
  6. **Звонок** — see Phase 4.
  7. **Сводный экран** — what passed/failed + link to re-read теория; reuse existing analytics styling.

## Phase 3 — AI grading (server functions, Lovable AI Gateway)
- `gradeWritten` and `gradeCallAnswer` server fns: input answer + criteria → structured `{ metCriteria[], unmetCriteria[], guidingQuestion, passed }` via `Output.object` (reuse `ai-gateway.server.ts`).
- Quiz/calc/case grade locally (deterministic) — no AI needed.
- Hint progression and attempt status recorded to `task_attempts`.

## Phase 4 — Voice call (звонок)
- Real voice loop via Lovable AI Gateway: mic record (webm/mp4) → `/api/transcribe` (STT `gpt-4o-mini-transcribe`) → character reply server fn (Gemini, fed the lesson's system prompt + hidden-info reveal rule) → TTS playback. Character only reveals hidden info when the reveal condition is met.
- Ends with the open question → graded by `gradeCallAnswer` (max 2 hints, then разбор).
- Call UI lives inside the laptop Calls app (Phase 5).

## Phase 5 — macOS-style laptop desktop + call notifications
- Clicking the laptop opens a full macOS-like desktop inside the modal: top menu bar (clock, wifi/battery), a dock, and app icons — **Calls**, **Mail/Messages** (stakeholder messages), **Docs/Finder** (resources), **Notes** (whiteboard), **Tasks** (current step actions).
- Each app opens a window pane within the desktop.
- **Calls app**: shows the lesson's AI character; when a lesson reaches the звонок step, a macOS-style incoming-call notification appears (banner + ring), badge on the laptop and dock Calls icon; clicking connects the voice call.
- Keep current desk/phone/whiteboard hotspots; route their content through the new desktop apps where it makes sense.

## Technical notes
- Voice defaults to Lovable AI (STT + Gemini + TTS); no extra connector needed. ElevenLabs is an option later if you want a true real-time agent.
- All `process.env` reads inside server fn handlers; protected fns under `_authenticated` only.
- Course content is large — Phase 1 authoring of all 21 lessons is the biggest single chunk.

## Suggested build order
0 → 1 → 2 → 3 → 4 → 5. Phases 2–3 make one fully playable lesson; Phase 1 then fills all 21; Phases 4–5 layer voice + the macOS desktop.
