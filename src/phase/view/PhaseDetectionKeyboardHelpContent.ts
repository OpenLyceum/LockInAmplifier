/** Keyboard guidance for the sliders and playback on the P3 instruments. */
import {
  BasicActionsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

import { LockInAmplifierHotkeyData as keys } from "../../common/LockInAmplifierHotkeyData.js";
import { instrumentActionHelp, instrumentKnobHelp } from "../../common/view/instrumentKeyboard.js";

export class PhaseDetectionKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super(
      [new SliderControlsKeyboardHelpSection({ includeSmallerStepsRow: false }), instrumentKnobHelp(false)],
      [
        instrumentActionHelp(keys.autoPhase),
        new TimeControlsKeyboardHelpSection(),
        new BasicActionsKeyboardHelpSection({ withCheckboxContent: true }),
      ],
    );
  }
}
