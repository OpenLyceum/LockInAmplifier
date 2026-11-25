# Implementation notes — Lock-In Amplifier

Developer-facing architecture notes for `lock-in-amplifier`.

## Architecture

Screens: src/signal-and-noise/, src/mixing/, src/filtering/, src/phase/, src/lab/

- Models own state and `step` / `reset`; views observe Properties and never integrate physics.
- Colors live in `src/LockInAmplifierColors.ts`; strings in `src/i18n/` via `StringManager`.
- Preferences shell: `src/preferences/` (empty until sim-specific prefs are added).

## Notes

*Record design decisions, performance constraints, and known limitations here.*
