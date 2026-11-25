import { PatternStringProperty } from "scenerystack/axon";
import { Text, VBox } from "scenerystack/scenery";
import { AquaRadioButtonGroup } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import { instrumentFont, instrumentStrings } from "../common/view/instrumentText.js";
import { StringManager } from "../i18n/StringManager.js";
import Colors from "../LockInAmplifierColors.js";
import { CONTROL_SETTINGS, NOISE_SETTINGS } from "../LockInAmplifierConstants.js";
import LockInAmplifierNamespace from "../LockInAmplifierNamespace.js";
import type { LockInAmplifierPreferencesModel } from "./LockInAmplifierPreferencesModel.js";

export class LockInAmplifierPreferencesNode extends VBox {
  public constructor(model: LockInAmplifierPreferencesModel, tandem?: Tandem) {
    const title = StringManager.getInstance().getPreferences().mainsFrequencyStringProperty;
    const textOptions = { font: instrumentFont, fill: Colors.controlSurfaceTextColorProperty };
    const group = new AquaRadioButtonGroup(
      model.mainsFrequencyProperty,
      Object.values(NOISE_SETTINGS.MAINS_FREQUENCIES)
        .sort((a, b) => a - b)
        .map((value) => {
          const label = new PatternStringProperty(instrumentStrings.units.hertzStringProperty, { value });
          return { value, options: { accessibleName: label }, createNode: () => new Text(label, textOptions) };
        }),
      {
        accessibleName: title,
        orientation: "horizontal",
        ...(tandem && { tandem: tandem.createTandem("mainsFrequencyRadioButtonGroup") }),
      },
    );
    super({ align: "left", spacing: CONTROL_SETTINGS.CONTENT_GAP, children: [new Text(title, textOptions), group] });
  }
}

LockInAmplifierNamespace.register("LockInAmplifierPreferencesNode", LockInAmplifierPreferencesNode);
