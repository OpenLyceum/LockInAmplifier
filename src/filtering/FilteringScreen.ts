/**
 * FilteringScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createFilteringIcon() in src/common/LockInAmplifierScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createFilteringIcon } from "../common/LockInAmplifierScreenIcons.js";
import LockInAmplifierColors from "../LockInAmplifierColors.js";
import { FilteringModel } from "./model/FilteringModel.js";
import { FilteringKeyboardHelpContent } from "./view/FilteringKeyboardHelpContent.js";
import { FilteringScreenView } from "./view/FilteringScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type FilteringScreenOptions = ScreenOptions & { tandem: Tandem };

export class FilteringScreen extends Screen<FilteringModel, FilteringScreenView> {
  public constructor(options: FilteringScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new FilteringModel(),
      // View factory — receives the model instance
      (model) =>
        new FilteringScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<FilteringScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: LockInAmplifierColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new FilteringKeyboardHelpContent(),
          homeScreenIcon: createFilteringIcon(),
          navigationBarIcon: createFilteringIcon(),
        },
        options,
      ),
    );
  }
}
