# 0002 — Optional biometric (fingerprint/Face ID) app lock

**Status:** Proposed
**Date:** 2026-08-27
**Deciders:** <names>

## Context

What is the situation? What constraints are in play? Link to issues, performance data, or prior discussion.

- Product invariant #1 in `CLAUDE.md` states the app opens straight into "enter your holdings" — no login, no gate before that screen.
- This feature request (biometric unlock) introduces a gate before that screen, which conflicts with the letter of invariant #1.
- Note what does *not* change: no accounts, no identity, no network calls, no tracking. The check is a local biometric prompt (`expo-local-authentication`) with an app-level PIN fallback, guarding data that already lives only in `AsyncStorage` on-device.

## Decision

Invariant #1 ("no login — app opens straight into holdings") is amended:
the app now gates the holdings screen behind a local unlock check, **on by
default**, for all users.

- **Primary:** `expo-local-authentication` biometric prompt (fingerprint/Face
  ID) when the device has biometrics enrolled.
- **Fallback:** an **app-level PIN**, set up on first launch after this
  feature ships (or on fresh install), used whenever biometrics are
  unavailable — not enrolled, sensor failure, or the user cancels/declines
  the biometric prompt. This replaces the earlier "OS device passcode"
  fallback design: the PIN is our own, not the phone's lock screen PIN.
- The PIN is stored locally only (hashed, on-device — e.g. via
  `expo-secure-store`), same as holdings data never leaving the device. No
  account, no server-side identity, no recovery service.
- **Forgotten PIN:** a "Forgot PIN" option wipes local holdings data
  (`AsyncStorage`) and the stored PIN, returning the app to first-launch
  onboarding. This is a deliberate data-loss path, consistent with the
  local-only model — losing the PIN is treated the same as losing the phone.
  This must be communicated clearly in the UI at PIN setup time ("if you
  forget this PIN, your saved holdings will be erased") so it isn't a
  surprise.
- The no-lock-configured edge case from the earlier draft (device with no
  biometric and no device passcode) no longer applies — the app PIN is
  always available as a fallback regardless of device configuration.
- This does not reintroduce tracking or identity: nothing here leaves the
  device, and Punji Bandhu still doesn't know who is using it.

## Consequences

- **Easier:** holdings data at rest is protected from casual access (someone
  picking up an unlocked-but-idle phone) without building or maintaining any
  auth/account system.
- **Harder:** invariant #1 is no longer absolute — every future screen/flow
  change needs to account for "gate exists before holdings" as a fact of the
  app, not an edge case. The `/pr-checklist` and hooks enforcing invariant #1
  need updating so they don't false-positive on this ADR's own change.
- **New constraint:** the "Forgot PIN → wipe & reset" path is the *only*
  acceptable recovery mechanism given no accounts/no server. Any future
  change to this gate must preserve a recovery path that doesn't require
  inventing an account system — see Alternatives.
- **New dependency:** `expo-local-authentication` and `expo-secure-store`
  are added to the app (runtime dependency additions, per the root
  `CLAUDE.md` ADR-required list — covered by this ADR).
- **Risk accepted:** a small subset of parents'-generation users may find an
  unexpected unlock prompt confusing on first launch after update. Consider
  a one-time explanatory copy line ("Punji Bandhu now asks you to unlock
  your phone to see your holdings") rather than a silent behavior change.

## Alternatives Considered

- **Do nothing** — reject the feature, keep invariant #1 absolute. Rejected:
  explicit user request, and the local-only check doesn't reintroduce the
  things invariant #1 actually guards against (accounts, tracking, identity).
- **Opt-in, off by default** — would have preserved "opens straight into
  holdings" for users who don't enable it. Rejected by explicit decision:
  this ships on by default for all users.
- **OS device passcode as fallback (no app PIN)** — the original design in
  this ADR. Rejected: a meaningful share of the target audience (older
  devices, users who never set up a phone lock screen) would have no
  fallback at all, silently losing the lock entirely. Superseded by the
  app-level PIN, which is always available regardless of device state.
- **Biometric-only, no fallback of any kind** — rejected. Locks out any user
  without enrolled biometrics with no alternative, unacceptable given the
  target audience skews toward less tech-savvy users on a range of device
  ages.
- **PIN reset with no data wipe** (e.g. security questions, a recovery
  phrase) — rejected. Any real recovery mechanism requires storing a second
  secret or shipping a backend, both of which conflict with "no accounts,
  local-only data." Wipe-and-reset is the only recovery path that doesn't
  require inventing infrastructure this app deliberately doesn't have.

## References

- Related ADRs: 0001
- Issues/PRs: #...
- External: <links>
