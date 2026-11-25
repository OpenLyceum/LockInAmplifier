/**
 * VirtualExperimentScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createVirtualExperimentIcon() in src/common/LockInAmplifierScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createVirtualExperimentIcon } from "../common/LockInAmplifierScreenIcons.js";
import LockInAmplifierColors from "../LockInAmplifierColors.js";
import type { LockInAmplifierPreferencesModel } from "../preferences/LockInAmplifierPreferencesModel.js";
import parameters from "../preferences/lockInAmplifierQueryParameters.js";
import { VirtualExperimentModel } from "./model/VirtualExperimentModel.js";
import { VirtualExperimentKeyboardHelpContent } from "./view/VirtualExperimentKeyboardHelpContent.js";
import { VirtualExperimentScreenView } from "./view/VirtualExperimentScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type VirtualExperimentScreenOptions = ScreenOptions & { tandem: Tandem; preferences?: LockInAmplifierPreferencesModel };

export class VirtualExperimentScreen extends Screen<VirtualExperimentModel, VirtualExperimentScreenView> {
  public constructor(options: VirtualExperimentScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new VirtualExperimentModel(parameters.seed, options.preferences?.mainsFrequencyProperty),
      // View factory — receives the model instance
      (model) =>
        new VirtualExperimentScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<VirtualExperimentScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: LockInAmplifierColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new VirtualExperimentKeyboardHelpContent(),
          homeScreenIcon: createVirtualExperimentIcon(),
          navigationBarIcon: createVirtualExperimentIcon(),
        },
        options,
      ),
    );
  }
}
