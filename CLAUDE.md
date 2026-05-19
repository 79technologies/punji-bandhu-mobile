# Punji Bandhu — Claude Project Notes

> Read this before touching code. The product invariants here override generic
> "best practice" advice from any skill. If a skill conflicts, the invariants win.

## What this is

A mobile app that lets a user enter their stock holdings (symbol + quantity)
and see the live market value of their portfolio. Built for an audience that
historically tracks portfolios by *phoning their broker* — the parents'
generation — for whom existing trading apps are intimidating and overbuilt.

## Product invariants (non-negotiable)

1. **No login.** No sign-up, no OTP, no email, no social login, no profile.
   The app opens straight into "enter your holdings".
2. **No tracking.** No analytics SDKs. No device identifiers. No crash
   reporters that send user IDs. No A/B testing libraries. We do not know
   *who* is using the app and we never want to.
3. **Local-only data.** Holdings are stored in `AsyncStorage` on the device.
   They never leave the phone. Network requests fetch *quote data by symbol*
   and nothing else — the request payload is identical between two users who
   hold the same symbols.
4. **Audience first.** Default font ≥ 16pt body / ≥ 20pt heading. Tap targets
   ≥ 48×48dp. Plain-English copy ("Total value", not "AUM"; "Today's change",
   not "MTM"). No animations that obscure information.

These four are enforced by hooks in `.claude/hooks/` and by the `/pr-checklist`
command. If a change requires breaking one of them, write an ADR (`/adr`) and
get explicit user approval before implementing.

## Tech stack

- Expo (managed workflow) + expo-router + TypeScript.
- `AsyncStorage` for holdings.
- A public quote endpoint (TBD — see `src/services/quotes.service.ts`).
- No state library yet. React `useState` + a small context if needed.

## Default branch

`main`.

## Repository layout (target)

```
app/                         # expo-router routes only — no plain .ts files here
  index.tsx                  # landing / portfolio screen
  about.tsx                  # what this app is + privacy statement
  components/                # shared components (HoldingCard, EmptyState, …)
src/                         # non-route modules (never imported by expo-router)
  theme/
    tokens.ts                # colors, spacing, type scale
  services/
    quotes.service.ts        # quote fetching
  storage/
    holdings.storage.ts      # AsyncStorage wrapper
  types/
    domain.ts                # Holding, Quote, PortfolioValue
```

## Commit & push

See `.claude/skills/git/SKILL.md`. Short version: never commit on your own
initiative; never include AI attribution in messages (a hook enforces this).

## When in doubt

If a request would weaken privacy, add tracking, introduce auth, or make the
UI more like a "real" trading app, push back before implementing. The whole
point of Punji Bandhu is to *not* be one of those.
