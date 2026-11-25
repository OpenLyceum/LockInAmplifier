/**
 * PhaseDetectionScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createPhaseDetectionIcon() in src/common/LockInAmplifierScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createPhaseDetectionIcon } from "../common/LockInAmplifierScreenIcons.js";
import LockInAmplifierColors from "../LockInAmplifierColors.js";
import parameters from "../preferences/lockInAmplifierQueryParameters.js";
import { PhaseDetectionModel } from "./model/PhaseDetectionModel.js";
import { PhaseDetectionKeyboardHelpContent } from "./view/PhaseDetectionKeyboardHelpContent.js";
import { PhaseDetectionScreenView } from "./view/PhaseDetectionScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type PhaseDetectionScreenOptions = ScreenOptions & { tandem: Tandem };

export class PhaseDetectionScreen extends Screen<PhaseDetectionModel, PhaseDetectionScreenView> {
  public constructor(options: PhaseDetectionScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new PhaseDetectionModel(parameters.seed),
      // View factory — receives the model instance
      (model) =>
        new PhaseDetectionScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<PhaseDetectionScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: LockInAmplifierColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new PhaseDetectionKeyboardHelpContent(),
          homeScreenIcon: createPhaseDetectionIcon(),
          navigationBarIcon: createPhaseDetectionIcon(),
        },
        options,
      ),
    );
  }
}
