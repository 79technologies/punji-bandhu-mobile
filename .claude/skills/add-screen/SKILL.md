---
name: add-screen
description: Use when adding a new screen or modal to the Punji Bandhu app — a new portfolio screen, holding entry/edit form, settings, about, or a confirmation modal.
---

# Skill: add-screen

Use when adding a new screen or modal to the app — e.g. a new step in the *enter holdings → view portfolio* flow, a settings screen, an about/disclaimer screen, or an overlay for adding/editing a single holding.

## Trigger phrases
"add a screen", "create a new page", "add a modal", "new route", "scaffold a screen", "add a portfolio screen"

## Product invariants (do not violate when adding a screen)

- **No login.** Never add an auth screen, sign-up flow, OTP, or social login.
- **No tracking.** Do not import analytics SDKs, do not call `fetch` to any logging/analytics endpoint, do not add device identifiers.
- **Local-only state.** Holdings live in on-device storage (`AsyncStorage`). Do not POST them anywhere.
- **Audience is the parents' generation.** Default font size large, tap targets ≥ 48dp, plain-English copy, no jargon ("Holdings" not "Positions", "Total value" not "AUM").

## Steps

1. **Decide: route or modal?**
   - Full screens reached via navigation (Portfolio, Add Holding, Settings, About) → `expo-router` file in `app/`.
   - Overlays on top of an existing screen (confirm-delete, edit-quantity) → Modal component in `app/components/`.

2. **For a new expo-router screen**
   - Create `app/<screen-name>.tsx` (or `app/(group)/<screen-name>.tsx` for a grouped flow).
   - Define `export default function <ScreenName>()`.
   - Use `useLocalSearchParams()` for route params; `useRouter()` for navigation.
   - Wire navigation from the calling screen with `router.push('/<screen-name>')` or `<Link>`.
   - Wrap the screen in `SafeAreaView` and use the design tokens from `app/theme/` (no magic colors).

3. **For a new Modal component**
   - Create `app/components/<FeatureName>Modal.tsx`.
   - Required props: `visible: boolean`, `onClose: () => void`.
   - Wrap content in `<Modal animationType="slide" transparent visible={visible}>`.
   - Parent owns `visible`; the modal only calls `onClose`.

4. **Mandatory checklist before finishing**
   - [ ] All props have explicit TypeScript types — no `any`.
   - [ ] `StyleSheet.create()` used for all styles — no inline objects.
   - [ ] Body text ≥ 16pt, headings ≥ 20pt, tap targets ≥ 48×48dp.
   - [ ] Colors and spacing pulled from `app/theme/` tokens, not hardcoded hex.
   - [ ] `FlatList` items have `keyExtractor`.
   - [ ] Component is exported as `default` and named to match the file.
   - [ ] No `console.log` left in the file.
   - [ ] No analytics imports, no remote logging, no device IDs.
   - [ ] Run `npx tsc --noEmit` — zero errors.
   - [ ] Run `npm run lint` — zero warnings.

## Pattern reference

Existing screens to copy from:
- Landing / welcome: `app/index.tsx`
- Portfolio list: `app/portfolio.tsx`
- Holding form modal: `app/components/HoldingFormModal.tsx`
- Theme tokens: `app/theme/tokens.ts`
