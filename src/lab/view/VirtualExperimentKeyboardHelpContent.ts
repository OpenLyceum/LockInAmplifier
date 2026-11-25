/** The rotary controls use the same keyboard value handler as the sample slider. */
import {
  BasicActionsKeyboardHelpSection,
  ComboBoxKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

import { LockInAmplifierHotkeyData as keys } from "../../common/LockInAmplifierHotkeyData.js";
import { instrumentActionHelp, instrumentKnobHelp } from "../../common/view/instrumentKeyboard.js";

export class VirtualExperimentKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super(
      [new SliderControlsKeyboardHelpSection({ includeSmallerStepsRow: false }), new ComboBoxKeyboardHelpSection()],
      [
        instrumentKnobHelp(true),
        instrumentActionHelp(keys.autoPhase, keys.record),
        new BasicActionsKeyboardHelpSection({ withCheckboxContent: true }),
      ],
    );
  }
}
