/**
 * By-hand headless soak: npm run test:soak:headless (never in CI).
 *
 * List the screens exactly as main.ts builds them. The harness in
 * tests/helpers/headlessSoak.ts (template-owned) presses every control, sets every slider,
 * steps, switches screens, flips the color profile and locale, presses Reset All, and
 * fails when listener counts, node counts or retained heap rise after every round.
 *
 * Add `actions` for what only this sim can do (record/clear, add/remove objects) and
 * `exclude` for controls that must not be pressed headless.
 */

import { StringProperty } from "scenerystack/axon";
import { Tandem } from "scenerystack/tandem";
import { FilteringScreen } from "../../src/filtering/FilteringScreen.js";
import LockInAmplifierColors from "../../src/LockInAmplifierColors.js";
import { VirtualExperimentScreen } from "../../src/lab/VirtualExperimentScreen.js";
import { MixingScreen } from "../../src/mixing/MixingScreen.js";
import { PhaseDetectionScreen } from "../../src/phase/PhaseDetectionScreen.js";
import { SignalAndNoiseScreen } from "../../src/signal-and-noise/SignalAndNoiseScreen.js";
import { describeHeadlessSoak } from "../helpers/headlessSoak.js";

describeHeadlessSoak({
  screens: () => [
    new SignalAndNoiseScreen({ name: new StringProperty("Signal and Noise"), tandem: Tandem.OPT_OUT }),
    new MixingScreen({ name: new StringProperty("Mixing"), tandem: Tandem.OPT_OUT }),
    new FilteringScreen({ name: new StringProperty("Filtering"), tandem: Tandem.OPT_OUT }),
    new PhaseDetectionScreen({ name: new StringProperty("Phase Detection"), tandem: Tandem.OPT_OUT }),
    new VirtualExperimentScreen({ name: new StringProperty("Virtual Experiment"), tandem: Tandem.OPT_OUT }),
  ],
  tracked: () => ({ LockInAmplifierColors }),
});
