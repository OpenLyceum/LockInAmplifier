/** Keyboard guidance for the sliders and playback on the P3 instruments. */
import {
  BasicActionsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class PhaseDetectionKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super(
      [new SliderControlsKeyboardHelpSection()],
      [new TimeControlsKeyboardHelpSection(), new BasicActionsKeyboardHelpSection()],
    );
  }
}
