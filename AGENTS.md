# AGENTS.md — Lock-In Amplifier

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Lock-In Amplifier (`lock-in-amplifier`) is a SceneryStack simulation scaffolded from SceneryStackTemplate.

## Key files

| File | Purpose |
|---|---|
| `src/LockInAmplifierColors.ts` | All `ProfileColorProperty` instances |
| `src/LockInAmplifierConstants.ts` | Named numeric constants |
| `src/LockInAmplifierNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor |
| `src/common/LockInAmplifierPanel.ts` | Pre-themed `Panel` wrapper |
| `src/common/LockInAmplifierButtonOptions.ts` | Flat button / combo-box option bundles |
| `src/common/TimeModel.ts` | Play/pause, speed, and elapsed time composed by screen models |
| `src/signal-and-noise/SignalAndNoiseScreen.ts` | Screen wrapper |
| `src/signal-and-noise/model/SignalAndNoiseModel.ts` | Simulation state and logic |
| `src/signal-and-noise/view/SignalAndNoiseScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/mixing/MixingScreen.ts` | Screen wrapper |
| `src/mixing/model/MixingModel.ts` | Simulation state and logic |
| `src/mixing/view/MixingScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/filtering/FilteringScreen.ts` | Screen wrapper |
| `src/filtering/model/FilteringModel.ts` | Simulation state and logic |
| `src/filtering/view/FilteringScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/phase/PhaseDetectionScreen.ts` | Screen wrapper |
| `src/phase/model/PhaseDetectionModel.ts` | Simulation state and logic |
| `src/phase/view/PhaseDetectionScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/lab/VirtualExperimentScreen.ts` | Screen wrapper |
| `src/lab/model/VirtualExperimentModel.ts` | Simulation state and logic |
| `src/lab/view/VirtualExperimentScreenView.ts` | Visual nodes, layout, a11y wiring |

## Compliance carve-outs

None yet.
