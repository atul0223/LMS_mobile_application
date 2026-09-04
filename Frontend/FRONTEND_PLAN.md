# LMS Frontend — Build Plan (Two Agents)

Expo SDK 57 / React Native 0.86 / expo-router. Read
`https://docs.expo.dev/versions/v57.0.0/` before writing code — per `AGENTS.md`,
the APIs have changed and guessing produces broken code.

**Already installed, do not re-install:** `expo-secure-store`, `expo-video`,
`expo-image-picker`, `expo-router`, `react-native-safe-area-context`.

---

## The coordination problem

Two agents editing one app will produce two visual languages and two fetch
conventions unless the shared foundation is built **once, first, and frozen**.

So the split is deliberately uneven:

- **Agent A (me)** builds the foundation + auth + the student read path.
  Everything Agent B depends on lands here first.
- **Agent B** builds the purchase flow, video playback, and the entire teacher
  side — strictly consuming A's primitives, never redefining them.

**Agent B must not create or edit any file under `src/theme/`, `src/lib/`, or
`src/components/`.** If B needs something that doesn't exist there, B stops and
reports it rather than inventing a local variant. This is the single rule that
keeps the codebase consistent.

---

## Ownership at a glance

Legend: **[A]** = Agent A (Claude, this session) · **[B]** = Agent B (other agent)

| Area | Owner | Files |
|---|---|---|
| Theme tokens | **A** | `src/theme/colors.ts`, `src/theme/index.ts` |
| App config (light mode) | **A** | `app.json` |
| Storage / API / session | **A** | `src/lib/storage.ts`, `src/lib/api.ts`, `src/lib/session.ts` |
| Shared types | **A** | `src/types/api.ts` |
| Component library | **A** | all of `src/components/` |
| Root layout + boot redirect | **A** | `src/app/_layout.tsx`, `src/app/index.tsx` |
| Auth screens | **A** | `src/app/(auth)/*` |
| Student tabs + feed + search | **A** | `src/app/(student)/_layout.tsx`, `index.tsx`, `search.tsx` |
| Course detail + purchase | **B** | `src/app/(student)/course/[id].tsx` |
| Video playback | **B** | `src/app/(student)/watch/[courseId].tsx` |
| Teacher area (all) | **B** | `src/app/(teacher)/*` |

**Ordering:** A lands everything above before B starts. B is blocked on A's
handoff report — starting earlier means building against primitives that do not
exist yet.

**Files B may never touch:** `src/theme/**`, `src/lib/**`, `src/components/**`,
`src/types/api.ts`, `app.json`, `src/app/_layout.tsx`, `src/app/index.tsx`,
`src/app/(auth)/**`, `src/app/(student)/_layout.tsx`.

**Files A will not touch after handoff:** `src/app/(student)/course/**`,
`src/app/(student)/watch/**`, `src/app/(teacher)/**` — so the two of us never
edit the same file.

---

## Design system (binding for both agents)

Professional, light, restrained. No gradients, no shadows heavier than a hairline
border, no decorative color. Color carries meaning only: primary = action,
danger = destructive, success = confirmation.

### Palette — `src/theme/colors.ts`

| Token | Value | Use |
|---|---|---|
| `background` | `#F7F8FA` | screen background |
| `surface` | `#FFFFFF` | cards, inputs, sheets |
| `surfaceMuted` | `#F1F3F5` | pressed states, skeletons |
| `border` | `#E3E6EA` | hairline dividers, input borders |
| `borderStrong` | `#CDD3DA` | focused input border |
| `textPrimary` | `#1A1D21` | headings, body |
| `textSecondary` | `#5C6670` | labels, captions |
| `textTertiary` | `#8A939C` | placeholders, disabled |
| `primary` | `#1F5EFF` | primary actions, links, active tab |
| `primaryPressed` | `#1A4FD6` | pressed primary |
| `primarySoft` | `#EBF1FF` | selected chip background |
| `success` | `#12805C` | enrolled / completed |
| `successSoft` | `#E6F4EF` | success badge background |
| `danger` | `#C2321F` | destructive, error text |
| `dangerSoft` | `#FCEDEA` | error banner background |
| `warning` | `#8A6100` | lockout / verification notices |
| `warningSoft` | `#FDF3E0` | warning banner background |

Single light theme, no dark mode. `app.json` is already set to
`userInterfaceStyle: "light"` (done by Agent A) so the OS does not tint native
surfaces against the palette. Leave it that way.

### Scale — `src/theme/index.ts`

```ts
spacing: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48   (xs → xxxl)
radius:  6 (sm) / 10 (md) / 14 (lg) / 999 (pill)
type:
  display 28/34 700    title 22/28 700    heading 17/22 600
  body    15/21 400    label 13/18 500    caption 12/16 400
```

Every screen: `background`, content max-width 560 centered, horizontal padding
`lg` (16), section gap `xl` (20). Touch targets ≥ 44pt. Never hardcode a hex or a
raw number where a token exists.

---

## API contract (built by A, consumed by both)

Backend base URL from `EXPO_PUBLIC_API_URL`, defaulting to
`http://localhost:5002`. Agent A creates `.env.example` documenting it.

`src/lib/api.ts` exports:

```ts
class ApiError extends Error { status: number; body: any; }

api.get<T>(path, opts?):    Promise<T>
api.post<T>(path, body?):   Promise<T>
api.put<T>(path, body?):    Promise<T>
api.del<T>(path, body?):    Promise<T>
api.upload<T>(path, formData): Promise<T>   // multipart, no JSON content-type
```

Behavior every caller can rely on:
- Attaches `Authorization: Bearer <token>` from session storage automatically.
- Non-2xx throws `ApiError` carrying `status` and parsed `body` — screens branch
  on `status`, never on message text.
- **401 → clears the session and bounces to login.** Nothing else handles 401.
- 10s timeout via `AbortController`; a timeout throws `ApiError` with status `0`.

`src/lib/session.ts` exports a `SessionProvider` + `useSession()`:

```ts
{ token, user, isLoading, signIn(token), signOut(), refreshUser() }
```

Token persists via `expo-secure-store` (native-only, per the decision on record).
All storage calls live in `src/lib/storage.ts` behind
`getToken/setToken/deleteToken` so a web fallback is later a one-file change.
**No other file may import `expo-secure-store` directly.**

### Backend status codes both agents must handle

The API is deliberate about these; map them to UI, don't collapse to "error":

| Code | Meaning | UI |
|---|---|---|
| 400 | validation | inline field error |
| 401 | bad credentials / bad token | login error, or session clear |
| 403 | unverified, wrong role, not owner, **not enrolled** | explanatory notice |
| 404 | not found | empty state |
| 409 | already purchased | treat as success, refresh |
| 429 | lockout / OTP budget / rate limit | warning banner, `retryAfterSeconds` if present |

Login returns **403 with `requiresOtp: true`** for an unverified account — that
is a redirect to OTP, not a failure. Login returns **429** when locked out.
`verifyOtp` returns 429 when the 5-guess budget is spent.

---

## Route map

```
src/app/
  _layout.tsx              [A]  SessionProvider + Stack.Protected guards
  index.tsx                [A]  boot redirect by role
  (auth)/
    login.tsx              [A]
    signup.tsx             [A]
    verify-otp.tsx         [A]
  (student)/
    _layout.tsx            [A]  tabs: Browse / My Courses
    index.tsx              [A]  feed (all/popular/newest/free)
    search.tsx             [A]
    course/[id].tsx        [B]  detail + purchase
    watch/[courseId].tsx   [B]  player + lesson list
  (teacher)/
    _layout.tsx            [B]  tabs: Courses / New
    index.tsx              [B]  own course list
    course/new.tsx         [B]
    course/[id].tsx        [B]  edit / delete / upload
```

Auth gating uses `Stack.Protected guard={...}` in the root layout (the current
SDK 57 pattern), **not** manual `useEffect` redirects.

---

# PART 1 — Agent A (me) — ✅ COMPLETE

Status: **landed.** Typecheck clean, `expo export` bundles (1581 modules), and
25 backend contract assertions pass. See "Handoff report" at the end of this
file for the exact APIs as built.

### 1. Foundation
- [x] `src/theme/colors.ts`, `src/theme/index.ts` — tokens above.
- [x] `app.json`: `userInterfaceStyle` → `"light"`.
- [x] `src/lib/storage.ts` — `getToken/setToken/deleteToken`, sole
      `expo-secure-store` importer.
- [x] `src/lib/api.ts` — contract above (get/post/put/del/upload, `ApiError`,
      bearer injection, 401 → session clear, 10s timeout).
- [x] `src/lib/session.ts` — `SessionProvider` + `useSession()`.
- [x] `src/types/api.ts` — `Course`, `Video`, `User`, `Paginated<T>`,
      `AuthResponse`, mirroring the backend models exactly (note the backend
      field is `enrolledCources` — misspelled in the DB, kept for compatibility;
      do not "fix" it client-side).
- [x] `.env.example` with `EXPO_PUBLIC_API_URL`.

### 2. Component library — `src/components/`
Every component themed, no inline hexes:
- [x] `Button.tsx` — variants `primary | secondary | ghost | danger`, sizes
      `md | lg`, `loading` and `disabled` states.
- [x] `TextField.tsx` — label, placeholder, `error`, `secureTextEntry`,
      `keyboardType`, focused border state.
- [x] `Card.tsx` — surface + hairline border + radius `md`, optional `onPress`.
- [x] `Badge.tsx` — tones `neutral | success | warning | danger | info`.
- [x] `Banner.tsx` — inline notice, tones `error | warning | success | info`.
- [x] `EmptyState.tsx` — title, description, optional action.
- [x] `Screen.tsx` — SafeArea + background + max-width + padding wrapper.
- [x] `LoadingState.tsx` — centered spinner.
- [x] `CourseCard.tsx` — title, teacher, price (`Free` when `0`), enrolled badge,
      student count. **Used by both agents; B must reuse, not re-style.**

### 3. Auth
- [x] Root `_layout.tsx`: `SessionProvider`, `Stack.Protected` guards for
      `(auth)` / `(student)` / `(teacher)` keyed on token + role, splash held
      while `isLoading`.
- [x] `index.tsx`: redirect to student or teacher home by role.
- [x] `login.tsx`: identifier + password → `POST /user/login`. Handle 403
      `requiresOtp` → push OTP screen; 429 → warning banner with retry seconds;
      401 → generic inline error.
- [x] `signup.tsx`: username, email, fullName, password, role picker
      (student/teacher) → `POST /user/customSignup` → OTP screen. Note the
      backend returns a deliberately uniform "if the details are available…"
      message; surface it as-is, don't imply the account definitely exists.
- [x] `verify-otp.tsx`: 6-digit entry → `POST /user/verifyOtp` →
      `signIn(token)`. Handle 429 (budget spent) with a "request a new code"
      path via re-login.

### 4. Student read path
- [x] `(student)/_layout.tsx` — two tabs, themed.
- [x] `(student)/index.tsx` — `GET /student/courses/feed`, filter chips
      (all/popular/newest/free/enrolled), pull-to-refresh, pagination on scroll
      end, `CourseCard` list, empty + error states.
- [x] `(student)/search.tsx` — `GET /student/courses/search` with debounced
      query, optional min/max price, pagination.

### 5. Handoff
- [x] `npx tsc --noEmit` clean; Expo bundler starts without errors.
- [x] Report exact exported names and prop types for every component, the
      `api`/`useSession` signatures as built, and any deviation from this
      document.
- [x] Mark **Part 2 unblocked** at the top of Part 2 below.

---

# PART 2 — Agent B — LEFT FOR THE OTHER AGENT

> **Status: ✅ UNBLOCKED — ready to start.**
> Agent A's foundation is landed and verified. Read `AGENT_B_BRIEF.md`, then the
> "Handoff report" at the end of this file for the exact component props and
> API signatures as built (they differ slightly from the sketch above).

**Start here:** `AGENT_B_BRIEF.md` — onboarding, constraints, and known
gotchas, written to stand alone. Then follow the checklist below.

**Prerequisite:** start only after Agent A reports the foundation is landed.
Read `src/theme/index.ts`, `src/lib/api.ts`, `src/lib/session.ts`, and
`src/components/` first and build strictly on them.

**Hard constraints**
1. Do **not** create or modify anything in `src/theme/`, `src/lib/`, or
   `src/components/`. Need something missing? Report it; don't fork it.
2. No raw hex colors, no raw spacing numbers — tokens only.
3. Reuse `CourseCard`, `Button`, `TextField`, `Card`, `Badge`, `Banner`,
   `EmptyState`, `Screen`, `LoadingState` as-is.
4. All network calls go through `api.*`. Never call `fetch` directly, never read
   the token yourself, never handle 401 (the client already does).
5. Match the file layout and naming style A established.

### 1. Course detail + purchase — `(student)/course/[id].tsx`
- [ ] Course comes from the feed/search payload shape (`Course & { isEnrolled }`);
      there is no single-course GET endpoint, so accept it via route params or
      refetch the feed and select by id. **Do not add a backend endpoint.**
- [ ] Not enrolled → price and a **Purchase** button.
      Enrolled → a **Watch** button routing to `watch/[courseId]`.
- [ ] Purchase: `POST /student/courses/purchase` `{ courseId }`.
      - 200 → success banner, flip to enrolled, offer Watch.
      - **409 → already purchased: treat as success**, not an error.
      - 403 → unverified or wrong role notice.
      - 429 → rate-limit warning.
- [ ] Confirm intent before purchasing — it enrolls immediately and cannot be
      undone from the app (payment is still a backend TODO, so it is
      effectively free).

### 2. Video playback — `(student)/watch/[courseId].tsx`
- [ ] `GET /videos/course/:courseId` → `{ videos: [{ _id, title, description,
      metadata: { videolength, size, orderInCourse }, url,
      urlExpiresInSeconds }] }`.
- [ ] `url` is a **short-lived signed HLS `.m3u8`** (1 hour). It is not
      permanent — do not cache it to storage. If playback fails or the screen
      has been open past `urlExpiresInSeconds`, refetch the list to re-sign.
- [ ] Player via `expo-video`: `useVideoPlayer(url)` +
      `<VideoView player={...} />`, `nativeControls`, `contentFit="contain"`,
      16:9 container.
- [ ] Lesson list below the player, ordered by `metadata.orderInCourse`, current
      lesson highlighted; tapping switches source.
- [ ] **403 here means not enrolled** — render a "purchase to access" state
      linking back to the course, not a crash or a generic error.
- [ ] Handle a course with zero videos via `EmptyState`.

### 3. Teacher area
- [ ] `(teacher)/_layout.tsx` — tabs **Courses** / **New Course**, themed to
      match the student tabs exactly.

**`(teacher)/index.tsx`**
- [ ] `GET /teacher/courses`. `CourseCard` list showing price and enrolled
      count; tap → edit. Empty state → create.

**`(teacher)/course/new.tsx`**
- [ ] `POST /teacher/courses/create`
      `{ courseName, courseDescription, price, backgroundPic? }`.
- [ ] Backend requires non-empty `courseName` and `courseDescription`; `price`
      must be a non-negative number and the model caps it at 50000. Validate
      client-side to match, and map 400 to inline field errors.
- [ ] 201 → route to the new course's edit screen.

**`(teacher)/course/[id].tsx`** — edit, delete, and upload:
- [ ] Update: `PUT /teacher/courses/update`
      `{ courseId, newName?, newDescription?, newPrice? }`. Send only changed
      fields; the backend rejects an all-empty update with 400.
- [ ] Delete: `DELETE /teacher/courses/delete` `{ courseId }` — **confirm
      first**, it is irreversible. 403 = not owner.
- [ ] Video upload: `POST /teacher/video/upload`, multipart via `api.upload`,
      file field name **`mediaFile`**, plus `title`, `description`, `courseId`,
      `orderInCourse`.
      - Pick with `expo-image-picker` (`mediaTypes: ['videos']`).
      - Server accepts up to 700 MB and compresses anything over 95 MB —
        uploads are slow. Show a pending/indeterminate state and disable
        resubmit.
      - Map 400 (missing fields), 403 (not your course), 500 (processing
        failed).
- [ ] List the course's existing videos via `GET /videos/course/:courseId` (the
      owning teacher is authorized), ordered by `orderInCourse`.

### 4. Report back
- [ ] `npx tsc --noEmit` clean; Expo bundler starts without errors.
- [ ] List every file created, any place the backend response didn't match this
      document, and anything you needed from `src/components/` that wasn't
      there.

---

## Definition of done (both parts)

- `npx tsc --noEmit` clean in `Frontend/`.
- Expo bundler starts with no resolution or syntax errors.
- No raw hex outside `src/theme/colors.ts`.
- Every list screen has loading, empty, and error states.
- 401 handled only by the API client; 403/409/429 handled meaningfully at call sites.
- No `expo-secure-store` import outside `src/lib/storage.ts`.

---

# Handoff report — Agent A → Agent B

Everything in Part 1 is landed and verified. Below is what actually exists,
which in a few places is more than the sketch above described.

## Verification performed

- `npx tsc --noEmit` — clean (both `Frontend/` and `Backend/`)
- `npx expo export --platform ios` — bundles, 1581 modules, no resolution errors
- 25 contract assertions against the real backend on an in-memory MongoDB
  replica set: signup → OTP → session, `/user/me` shape, feed/search payloads,
  price filters, and the unverified-login 403 path

## Backend change you should know about

**`GET /user/me` is new.** Login and `verifyOtp` return only
`{ message, accessToken }`, and the JWT carries just `id` — so nothing told the
app the user's **role**, which the root layout needs to route students vs
teachers. Added:

```
GET /user/me   (auth required)  ->  { user: { _id, username, fullName,
                                              profilePic, email, role,
                                              isVerified, enrolledCources } }
```

It is deliberately **not** behind the strict auth limiter (that limiter now
applies per-route to login/signup/verifyOtp instead of to the whole `/user`
mount) — otherwise failed logins would throttle a signed-in user's own profile
reads. Verified with 14 consecutive calls from one IP.

Also fixed while verifying: `customSignup` returned **500** when the mail
provider failed, even though the account had been created — the user got an
error for a successful registration and could never reach verification. OTP
delivery failure is now logged and swallowed, matching the two other
`sendOtp` call sites.

## API client — `src/lib/api.ts`

As specified, with these specifics:

```ts
api.get<T>(path, options?)
api.post<T>(path, body?, options?)
api.put<T>(path, body?, options?)
api.del<T>(path, body?, options?)
api.upload<T>(path, formData, options?)

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  anonymous?: boolean;   // skips bearer injection (login/signup/verifyOtp)
  signal?: AbortSignal;
}

class ApiError extends Error {
  status: number;        // 0 = network failure or timeout
  body: any;             // parsed response body
  get isNetworkError(): boolean;
}
```

- `query` values that are `undefined`, `null`, or `""` are dropped, so you can
  pass optional filters directly without pre-filtering.
- Timeout is **10s** for normal calls and **10 minutes** for `api.upload` —
  video transcoding legitimately takes minutes, so do not add your own timeout.
- `Content-Type` is omitted for `FormData` so the multipart boundary survives.
- 401 clears the session centrally. **Do not handle 401.**

## Session — `src/lib/session.ts` + `src/lib/SessionProvider.tsx`

```ts
const { token, user, isLoading, signIn, signOut, refreshUser } = useSession();
```

`useSession()` and the `SessionValue` type come from `src/lib/session.ts`; the
provider component is `src/lib/SessionProvider.tsx` (split so the context module
stays JSX-free). You will only need `useSession`.

Note `refreshUser()` — call it after a purchase so `user.enrolledCources`
reflects the new enrollment. The student feed already calls it on focus.

## Bonus: `src/lib/useCourseList.ts`

Not in the original plan, but built for feed + search and **available to you**:

```ts
const { courses, isLoading, isRefreshing, isLoadingMore,
        error, hasMore, refresh, loadMore } = useCourseList({
  path: "/student/courses/feed",
  query: { filter: "all" },   // changing this resets to page 1
  enabled: true,              // false holds off fetching
});
```

Handles pagination, refresh, stale-response discarding, and swallows 401. Page
size is 10. Useful for the teacher course list if you want consistent behavior —
though note `GET /teacher/courses` is **unpaginated** and returns
`{ message, courses }` with no `pagination` object, so this hook does not fit it
as-is. Use a plain `api.get` there.

## Components — import from `@/components`

```ts
<Button label onPress? variant?="primary|secondary|ghost|danger"
        size?="md|lg" loading? disabled? fullWidth? style? accessibilityHint? />

<TextField label? value onChangeText placeholder? error? hint? secureTextEntry?
           keyboardType? autoCapitalize? autoComplete? textContentType?
           maxLength? multiline? editable? returnKeyType? onSubmitEditing?
           style? centered? />

<Card onPress? disabled? style? accessibilityLabel?>{children}</Card>

<Badge label tone?="neutral|success|warning|danger|info" style? />

<Banner message tone?="error|warning|success|info" title? style? />

<EmptyState title description? actionLabel? onAction? />

<Screen edges?=["top","bottom","left","right"] padded?=true style?>{children}</Screen>

<LoadingState message? fullscreen?=true />

<CourseCard course onPress? variant?="student|teacher" />
formatPrice(price?: number): string    // "Free" when absent or <= 0
```

Notes:
- `CourseCard variant="teacher"` swaps the owner name for the enrolled-student
  count — use it for the teacher course list.
- `TextField centered` gives the letter-spaced style used for OTP entry.
- `Screen padded={false}` when a `FlatList` supplies its own content padding
  (see `(student)/index.tsx` for the pattern, including the header-gutter
  subtlety).
- `formatPrice` uses `₹` / `en-IN`. Change it in one place if that is wrong.

## Placeholders you must replace

These exist only so typed routes resolve and the app runs end to end. Each is
marked `PLACEHOLDER — owned by Agent B`. **Replace them entirely; do not build
on top of them.**

- `src/app/(student)/course/[id].tsx`
- `src/app/(student)/watch/[courseId].tsx`
- `src/app/(teacher)/_layout.tsx`  (currently a Stack; make it tabs)
- `src/app/(teacher)/index.tsx`    (currently sign-out only)

## Navigating to your screens

The feed and search screens already push to course detail like this:

```ts
router.push({
  pathname: "/(student)/course/[id]",
  params: { id: course._id, course: JSON.stringify(course) },
});
```

The serialized `course` param is how you get the full object without a
single-course GET endpoint — parse it, and fall back to a feed refetch if the
param is missing (e.g. a cold deep link).

## Two things that will trip you up

1. **Route types are generated by the dev server**, not by `tsc`. If you add a
   screen and `router.push` to it fails to typecheck, run `npx expo start`
   briefly to regenerate `.expo/types/router.d.ts`, then re-run `tsc`.

2. **`tsconfig.json` now extends `expo/tsconfig.base`.** It previously did not,
   which left `skipLibCheck` off and `jsx` set to the outdated `"react"` — the
   baseline typecheck failed with ~40 React Native lib conflicts before I fixed
   it. Do not revert that. Because `jsx` is now `react-jsx`, **do not add
   `import React from "react"`** — it will be flagged as unused. Import only
   what you use (`useState`, `type ReactNode`, etc.).
