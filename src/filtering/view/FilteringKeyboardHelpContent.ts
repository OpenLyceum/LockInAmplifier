/** Keyboard guidance for the sliders and playback on the P3 instruments. */
import {
  BasicActionsKeyboardHelpSection,
  ComboBoxKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

import { LockInAmplifierHotkeyData as keys } from "../../common/LockInAmplifierHotkeyData.js";
import { instrumentActionHelp } from "../../common/view/instrumentKeyboard.js";

export class FilteringKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super(
      [new SliderControlsKeyboardHelpSection({ includeSmallerStepsRow: false }), new ComboBoxKeyboardHelpSection()],
      [
        instrumentActionHelp(keys.step, keys.record),
        new TimeControlsKeyboardHelpSection(),
        new BasicActionsKeyboardHelpSection(),
      ],
    );
  }
}
