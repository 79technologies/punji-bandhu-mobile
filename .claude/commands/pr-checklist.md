# /pr-checklist

Run the pre-PR review checklist against the current branch.

## What to do

1. Run `git diff main...HEAD --stat` (or `master` if that's the default) and identify the touched files.
2. For each touched file, check the items below.
3. Report **only what fails**, with the file path and line number.
4. End with a single-line verdict: ✅ ready to push, or ❌ `<count>` issues to fix.

## Checklist

### Privacy invariants (highest priority — these are the product promise)
- [ ] No login/auth screen, no OTP, no sign-up, no social login.
- [ ] No analytics SDK (no Mixpanel, Amplitude, Segment, Firebase Analytics, Sentry-with-userId, etc.).
- [ ] No device identifier collection (`expo-application` ID, `getUniqueId`, IDFA/AAID).
- [ ] Network requests carry no user identifier — symbols only, not "who holds them".
- [ ] Holdings are written to `AsyncStorage` (or `expo-secure-store`), never POSTed to a backend.
- [ ] No third-party crash/error reporter added without an ADR.

### TypeScript & types
- [ ] No `any`. No `as` casts without an explanatory comment.
- [ ] All component props have explicit TypeScript types.
- [ ] Context values are typed — no `createContext({})` without a generic.
- [ ] Domain types (`Holding`, `Quote`, `PortfolioValue`) used consistently.

### Security
- [ ] No hardcoded API keys, tokens, or provider credentials in the bundle.
- [ ] No `EXPO_PUBLIC_*` env var holds a *secret* (everything `EXPO_PUBLIC_` ships to clients).
- [ ] No secrets in any file that could be committed.

### Component quality
- [ ] `StyleSheet.create()` used for all styles — no inline style objects in JSX.
- [ ] `FlatList` has `keyExtractor` defined.
- [ ] Modal components accept `visible: boolean` and `onClose: () => void`.
- [ ] No dead code: no commented-out JSX blocks or unused variables.
- [ ] No `console.log` (unless the file is explicitly a debug/dev utility).

### Accessibility (audience: parents' generation)
- [ ] Body text ≥ 16pt, headings ≥ 20pt.
- [ ] Tap targets ≥ 48×48dp.
- [ ] Color contrast meets WCAG AA (≥ 4.5:1 for body text).
- [ ] `accessibilityLabel` set on icon-only buttons.
- [ ] Copy is plain English — no broker/trader jargon ("Total value" not "AUM", "Today's change" not "MTM").

### State & data flow
- [ ] No business logic directly inside `useEffect` — extracted to a named function.
- [ ] No new global state without justification in an ADR.
- [ ] Holdings load from storage on app start and persist on every mutation.

### Navigation
- [ ] New full screens use expo-router file-based routing, not `useState` boolean flags.
- [ ] No new conditional-render "navigation" patterns added.

### Performance
- [ ] Handlers passed to `FlatList` `renderItem` are wrapped in `useCallback`.
- [ ] Quote polling is bounded to focused-screen only (`useFocusEffect`); no background timers.
- [ ] All symbols batched into a single quote request — not one fetch per holding.

### Tests & checks
- [ ] `npx tsc --noEmit` passes with zero errors.
- [ ] `npm run lint` passes with zero warnings.

## Output Format

```
app/components/Foo.tsx:42 — inline style object instead of StyleSheet.create
app/portfolio.tsx:18 — fetch sends Authorization header (privacy invariant)

❌ 2 issues to fix.
```

Or:

```
✅ ready to push.
```
