/** Screen-reader orientation and live bench status. */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import type { VirtualExperimentModel } from "../model/VirtualExperimentModel.js";
import { labA11y, scenarioLabels } from "./labText.js";

export class VirtualExperimentScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: VirtualExperimentModel) {
    const summary = labA11y.screenSummary;
    const currentDetailsProperty = DerivedProperty.deriveAny(
      [
        model.scenarioProperty,
        model.rowsProperty,
        model.timer.timeProperty,
        model.referenceUnlockProperty,
        model.inputOverloadProperty,
        model.sensitivityProperty,
        ...Object.values(scenarioLabels),
        labA11y.currentDetailsStringProperty,
        labA11y.readingStringProperty,
        labA11y.unlockStringProperty,
        labA11y.inputOverloadStringProperty,
        labA11y.outputOverloadStringProperty,
      ],
      () => {
        const { x, y } = model.demodulator;
        const unlocked = model.referenceUnlockProperty.value;
        const reading = unlocked
          ? labA11y.unlockStringProperty.value
          : StringUtils.fillIn(labA11y.readingStringProperty.value, {
              frequency: toFixed(model.reference.frequencyHz, 1),
              x: x.toPrecision(3),
              y: y.toPrecision(3),
            });
        const status = [
          StringUtils.fillIn(labA11y.currentDetailsStringProperty.value, {
            scenario: scenarioLabels[model.scenarioProperty.value].value,
            count: model.rowsProperty.value.length,
            reading,
          }),
        ];
        if (model.inputOverloadProperty.value) {
          status.push(labA11y.inputOverloadStringProperty.value);
        }
        if (!unlocked && Math.abs(x) > model.sensitivityProperty.value) {
          status.push(labA11y.outputOverloadStringProperty.value);
        }
        return status.join(" ");
      },
    );
    super({
      playAreaContent: summary.playAreaStringProperty,
      controlAreaContent: summary.controlAreaStringProperty,
      currentDetailsContent: currentDetailsProperty,
      interactionHintContent: summary.interactionHintStringProperty,
    });
    this.disposeEmitter.addListener(() => currentDetailsProperty.dispose());
  }
}
