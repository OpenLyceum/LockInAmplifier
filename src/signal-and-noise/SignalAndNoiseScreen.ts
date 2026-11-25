/**
 * SignalAndNoiseScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createSignalAndNoiseIcon() in src/common/LockInAmplifierScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createSignalAndNoiseIcon } from "../common/LockInAmplifierScreenIcons.js";
import LockInAmplifierColors from "../LockInAmplifierColors.js";
import type { LockInAmplifierPreferencesModel } from "../preferences/LockInAmplifierPreferencesModel.js";
import parameters from "../preferences/lockInAmplifierQueryParameters.js";
import { SignalAndNoiseModel } from "./model/SignalAndNoiseModel.js";
import { SignalAndNoiseKeyboardHelpContent } from "./view/SignalAndNoiseKeyboardHelpContent.js";
import { SignalAndNoiseScreenView } from "./view/SignalAndNoiseScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type SignalAndNoiseScreenOptions = ScreenOptions & { tandem: Tandem; preferences?: LockInAmplifierPreferencesModel };

export class SignalAndNoiseScreen extends Screen<SignalAndNoiseModel, SignalAndNoiseScreenView> {
  public constructor(options: SignalAndNoiseScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new SignalAndNoiseModel(parameters.seed, options.preferences?.mainsFrequencyProperty),
      // View factory — receives the model instance
      (model) =>
        new SignalAndNoiseScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<SignalAndNoiseScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: LockInAmplifierColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new SignalAndNoiseKeyboardHelpContent(),
          homeScreenIcon: createSignalAndNoiseIcon(),
          navigationBarIcon: createSignalAndNoiseIcon(),
        },
        options,
      ),
    );
  }
}
