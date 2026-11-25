/** Live screen summary for the SignalAndNoise instruments. */
import { DerivedProperty } from "scenerystack/axon";
import { toFixedNumber } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { SignalAndNoiseModel } from "../model/SignalAndNoiseModel.js";

export class SignalAndNoiseScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: SignalAndNoiseModel) {
    const a11y = StringManager.getInstance().getSignalAndNoiseA11yStrings();
    const detailsProperty = new DerivedProperty(
      [a11y.currentDetailsStringProperty, model.frequencyProperty, model.signalRmsProperty, model.noiseRmsProperty],
      (pattern, frequency, signal, noise) =>
        StringUtils.fillIn(pattern, {
          frequency: toFixedNumber(frequency, 0),
          signal: toFixedNumber(signal, 3),
          noise: toFixedNumber(noise, 3),
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
