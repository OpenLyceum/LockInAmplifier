/** Live screen summary for the Mixing instruments. */
import { DerivedProperty } from "scenerystack/axon";
import { toFixedNumber } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { MixingModel } from "../model/MixingModel.js";

export class MixingScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: MixingModel) {
    const a11y = StringManager.getInstance().getMixingA11yStrings();
    const detailsProperty = new DerivedProperty(
      [a11y.currentDetailsStringProperty, model.effectiveReferenceProperty, model.phaseProperty, model.outputProperty],
      (pattern, frequency, phase, output) =>
        StringUtils.fillIn(pattern, {
          frequency: toFixedNumber(frequency, 0),
          phase: toFixedNumber((phase * 180) / Math.PI, 0),
          output: toFixedNumber(output, 3),
        }),
    );
    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: detailsProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
    this.disposeEmitter.addListener(() => detailsProperty.dispose());
  }
}
