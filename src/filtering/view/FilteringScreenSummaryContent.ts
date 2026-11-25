/** Live screen summary for the filter experiment. */
import { DerivedProperty } from "scenerystack/axon";
import { toFixedNumber } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import { FILTER_SETTINGS } from "../../LockInAmplifierConstants.js";
import type { FilteringModel } from "../model/FilteringModel.js";

export class FilteringScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: FilteringModel) {
    const a11y = StringManager.getInstance().getFilteringA11yStrings();
    const detailsProperty = new DerivedProperty(
      [
        a11y.currentDetailsStringProperty,
        model.xProperty,
        model.measuredSigmaProperty,
        a11y.measuredNoiseStringProperty,
        a11y.predictedNoiseStringProperty,
        model.timeConstantProperty,
        model.orderProperty,
        model.predictedSigmaProperty,
        model.measurementsProperty,
      ],
      (pattern, x, measured, measuredPattern, predictedPattern, tau, order, sigma, measurements) =>
        StringUtils.fillIn(pattern, {
          tau: tau * 1000,
          x: toFixedNumber(x * 1000, 1),
          slope: order * FILTER_SETTINGS.DB_PER_OCTAVE_PER_POLE,
          noise: StringUtils.fillIn(Number.isFinite(measured) ? measuredPattern : predictedPattern, {
            sigma: toFixedNumber((Number.isFinite(measured) ? measured : sigma) * 1000, 2),
          }),
          count: measurements.length,
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
