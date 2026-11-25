/**
 * MixingScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createMixingIcon() in src/common/LockInAmplifierScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createMixingIcon } from "../common/LockInAmplifierScreenIcons.js";
import LockInAmplifierColors from "../LockInAmplifierColors.js";
import parameters from "../preferences/lockInAmplifierQueryParameters.js";
import { MixingModel } from "./model/MixingModel.js";
import { MixingKeyboardHelpContent } from "./view/MixingKeyboardHelpContent.js";
import { MixingScreenView } from "./view/MixingScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type MixingScreenOptions = ScreenOptions & { tandem: Tandem };

export class MixingScreen extends Screen<MixingModel, MixingScreenView> {
  public constructor(options: MixingScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new MixingModel(parameters.seed),
      // View factory — receives the model instance
      (model) =>
        new MixingScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<MixingScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: LockInAmplifierColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new MixingKeyboardHelpContent(),
          homeScreenIcon: createMixingIcon(),
          navigationBarIcon: createMixingIcon(),
        },
        options,
      ),
    );
  }
}
