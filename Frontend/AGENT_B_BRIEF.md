# Agent B — Briefing

Copy this whole file (or point the agent at it) to start Agent B. It is written
to stand alone: it assumes no knowledge of the conversation that produced it.

---

## Your assignment

You are Agent B on a two-agent build of the **LMS mobile app** at
`C:\Users\user\Documents\LMS\Frontend` (Expo SDK 57, React Native 0.86,
expo-router, TypeScript).

Agent A has already built the shared foundation: theme tokens, the API client,
session handling, the component library, the auth screens, and the student
feed/search screens.

**You are building three things:**

1. Course detail + purchase — `src/app/(student)/course/[id].tsx`
2. Video playback — `src/app/(student)/watch/[courseId].tsx`
3. The entire teacher area — `src/app/(teacher)/**`

Full specifications are in **`FRONTEND_PLAN.md`, section "PART 2 — Agent B"**.
Read that file first; it is the source of truth. This briefing covers only how to
work alongside Agent A without breaking things.

---

## Before you write any line of code

1. **Check you are unblocked.** Open `FRONTEND_PLAN.md` and find the Part 2
   status line. If it says **BLOCKED**, stop and tell the user Agent A has not
   finished the foundation yet. Do not start.

2. **Read the Expo 57 docs.** `Frontend/AGENTS.md` requires it:
   `https://docs.expo.dev/versions/v57.0.0/`. The APIs changed in this SDK —
   `expo-video` and expo-router's auth patterns in particular. Fetch the
   versioned pages as `.md`. Code written from memory of older Expo will break.

3. **Read what Agent A built**, in this order:
   - `src/theme/index.ts` and `src/theme/colors.ts` — the tokens you must use
   - `src/lib/api.ts` — how to make every request
   - `src/lib/session.ts` — how to read the current user
   - `src/types/api.ts` — the shared types
   - `src/components/` — every component available to you
   - `src/app/(student)/index.tsx` — **your style reference.** Match its
     structure, naming, and error handling. Your screens should look like the
     same person wrote them.

---

## Hard constraints

These exist because two agents editing one codebase otherwise produce two
mismatched design systems.

1. **Never create or edit files in `src/theme/`, `src/lib/`, `src/components/`,
   or `src/types/api.ts`.** These are Agent A's. If you need a component or
   helper that isn't there, **stop and report it** — do not write a local
   variant, do not copy-paste one into your screen folder. A missing primitive
   is a coordination question, not a thing to work around.

2. **Also off-limits:** `app.json`, `src/app/_layout.tsx`, `src/app/index.tsx`,
   `src/app/(auth)/**`, `src/app/(student)/_layout.tsx`.

3. **No raw hex colors and no raw spacing numbers.** Every color comes from
   `theme.colors`, every gap/padding from `theme.spacing`, every corner from
   `theme.radius`, every font size from `theme.type`. If a value you need has no
   token, report it rather than hardcoding.

4. **All network calls go through `api.*` from `src/lib/api.ts`.** Never call
   `fetch` directly. Never read the auth token yourself. Never import
   `expo-secure-store`. Never write 401 handling — the API client already clears
   the session and redirects on 401; duplicating it causes double-redirects.

5. **Do not touch anything in `Backend/`.** If a screen seems to need an endpoint
   that doesn't exist, report it. (One is known: there is no single-course GET —
   see below.)

---

## Things that will bite you

**No single-course endpoint.** The backend only returns courses inside feed and
search lists. Your course detail screen must take the course through route params
or refetch the feed and select by id. Do not add a backend route.

**Video URLs expire.** `GET /videos/course/:courseId` returns signed HLS `.m3u8`
URLs valid for ~1 hour, with `urlExpiresInSeconds` alongside. Never persist them.
If playback errors or the screen has been open longer than that window, refetch
the list to get freshly signed URLs.

**403 is meaningful, not a generic failure.** On the watch screen it means *not
enrolled* — render a "purchase to access" state. On teacher routes it means *not
your course*. Never collapse 403 into "something went wrong".

**409 on purchase means already purchased** — treat it as success and show the
enrolled state, not an error.

**Uploads are slow.** The server accepts up to 700 MB and transcodes anything
over 95 MB. Show an indeterminate progress state and disable the submit button
while it runs, or users will fire duplicate uploads.

**Confirm before destructive actions.** Course deletion is irreversible.
Purchase enrolls immediately and can't be undone in-app. Both need a confirmation
step.

**The misspelled field is intentional.** The backend user field is
`enrolledCources` (sic). It is misspelled in the stored data and kept for
compatibility. Use it as-is; do not "correct" it.

---

## Backend status codes

| Code | Meaning | What the UI should do |
|---|---|---|
| 400 | validation failed | inline field error |
| 401 | bad token | nothing — the API client handles it |
| 403 | unverified / wrong role / not owner / **not enrolled** | explanatory state |
| 404 | not found | empty state |
| 409 | already purchased | treat as success |
| 429 | rate limited | warning banner, use `retryAfterSeconds` if present |

Branch on `error.status`, never on message text — the backend deliberately
returns uniform messages to avoid leaking account information.

---

## Environment

The API base URL comes from `EXPO_PUBLIC_API_URL` (see `.env.example`),
defaulting to `http://localhost:5002`. On a physical device, `localhost` points
at the phone, not the dev machine — it needs the machine's LAN IP. If requests
hang or fail immediately on device, check this before debugging your code.

---

## Definition of done

- [ ] `npx tsc --noEmit` clean in `Frontend/`
- [ ] Expo bundler starts with no resolution or syntax errors
- [ ] No raw hex or raw spacing numbers in any file you wrote
- [ ] Every list screen has loading, empty, and error states
- [ ] Every `[ ]` in `FRONTEND_PLAN.md` Part 2 ticked
- [ ] No files touched outside your assigned paths

## Report back with

1. Every file you created.
2. Anywhere the real backend response shape differed from `FRONTEND_PLAN.md`.
3. Anything you needed from `src/components/` that wasn't there and how you
   handled the gap.
4. Anything you deliberately left undone, and why.
