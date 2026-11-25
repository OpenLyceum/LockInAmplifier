/** Live screen summary for the filter experiment. */
import { DerivedProperty } from "scenerystack/axon";
import { toFixedNumber } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { FilteringModel } from "../model/FilteringModel.js";

export class FilteringScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: FilteringModel) {
    const a11y = StringManager.getInstance().getFilteringA11yStrings();
    const detailsProperty = new DerivedProperty(
      [
        a11y.currentDetailsStringProperty,
        model.timeConstantProperty,
        model.orderProperty,
        model.predictedSigmaProperty,
        model.measurementsProperty,
      ],
      (pattern, tau, order, sigma, measurements) =>
        StringUtils.fillIn(pattern, {
          tau: tau * 1000,
          order,
          sigma: toFixedNumber(sigma * 1000, 2),
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
