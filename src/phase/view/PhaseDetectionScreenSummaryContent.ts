/** Live output summary following the visible detector channels. */
import { DerivedProperty } from "scenerystack/axon";
import { toFixedNumber } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { PhaseDetectionModel } from "../model/PhaseDetectionModel.js";

export class PhaseDetectionScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: PhaseDetectionModel) {
    const a11y = StringManager.getInstance().getPhaseDetectionA11yStrings();
    const detailsProperty = new DerivedProperty(
      [
        a11y.currentDetailsStringProperty,
        a11y.singleDetailsStringProperty,
        model.modeProperty,
        model.xProperty,
        model.yProperty,
        model.rProperty,
        model.thetaProperty,
      ],
      (dual, single, mode, x, y, r, theta) =>
        StringUtils.fillIn(mode === "dual" ? dual : single, {
          x: toFixedNumber(x * 1000, 1),
          y: toFixedNumber(y * 1000, 1),
          r: toFixedNumber(r * 1000, 1),
          theta: toFixedNumber((theta * 180) / Math.PI, 0),
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
