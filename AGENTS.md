# AGENTS.md — Lock-In Amplifier

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Lock-In Amplifier (`lock-in-amplifier`) is a SceneryStack simulation scaffolded from SceneryStackTemplate.

## Sample pipeline

`TimeModel` handles transport and time speed. `SampleClock` converts frame time into batches of fixed 20,480 Hz samples and carries fractional samples across frames. The source or Lab apparatus generates voltage, `NoiseSource` adds seeded noise, `ReferenceOscillator` supplies I/Q reference values, and `Demodulator` multiplies and low-pass filters the products. Lab clips the input to the detector's selected range. Float64Array rings retain raw traces and trigger phase. `Decimator` generates 256 Hz chart histories. Time charts redraw at up to 30 Hz and spectra and histogram at about 5 Hz. See [implementation notes](doc/implementation-notes.md) for caps and triggering.

Signal and output voltages are peak unless labeled RMS. The sine phasor convention is `v(t) = |V| sin(ωt + arg V)` and the reference gain of 2 makes the matched X reading equal to the input peak. [Model derivations](doc/model.md) cover the scales and approximations.

## Shared model files

| Files | Purpose |
|---|---|
| `SampleClock.ts`, `SignalSource.ts`, `ReferenceOscillator.ts` | Fixed-rate scheduling and phase-continuous carriers |
| `NoiseSource.ts` | Seeded white, 1/f, mains, and random-walk noise |
| `Demodulator.ts`, `LowPassCascade.ts`, `LockInMath.ts` | I/Q products, filter state, and analytic predictions |
| `RingBuffer.ts`, `Decimator.ts`, `RunningStats.ts`, `Histogram.ts` | Histories, block averages, and distributions |
| `Spectrum.ts` | Hann-windowed FFT, absolute peak scaling, and power averages |

Shared model files live in `src/common/model/`. Unit and disposal tests use Vitest with happy-dom. Browser and fuzz tests use Playwright.

## Adding a Lab scenario

Implement `LabScenario` under `src/lab/model/scenarios/` with SI units and a scalar allocation-free `inputAt(t, ref)`. Put physical settings in `LAB_SETTINGS` and use the supplied seeded random stream for hidden parameters. Register the scenario, defaults, and row fields in the Lab model. Wire the localized scenario choice, apparatus controls, and reveal comparison in the Lab view. Test the predicted quadratures and exercise notebook capture, CSV export, and reset. The shared pipeline adds noise, clipping, and filtering.

## Copied code

| Source | Adapted files |
|---|---|
| OpenLyceum/Oscilloscope@`189ba3a` | `src/common/model/Spectrum.ts` |
| OpenLyceum/Oscilloscope@`8a0a81e` | `src/common/view/DisposalBag.ts` |
| OpenLyceum/Oscilloscope@`848aaa9` | `src/phase/view/RotaryKnob.ts`, `src/phase/view/KnobDragListener.ts` |
| OpenLyceum/Oscilloscope@`8bfc5f9` | `src/common/controls/{RotaryKnob,KnobDragListener,RotarySwitch,PanelButton}.ts`, `src/common/downloadFile.ts` |
| OpenLyceum/ACPhasor@`fe24fea` | `src/common/view/axisScale.ts` |
| OpenLyceum/ACPhasor@`880c49a` | `src/common/view/LockInAmplifierNumberControl.ts` |

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
