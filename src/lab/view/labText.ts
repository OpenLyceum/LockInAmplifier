/** Shared labels, dial formatting and typography for the Lab. */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { roundSymmetric } from "scenerystack/dot";
import { PhetFont } from "scenerystack/scenery-phet";
import { formatValue, instrumentStrings } from "../../common/view/instrumentText.js";
import { StringManager } from "../../i18n/StringManager.js";
import { LAB_LAYOUT_SETTINGS as layout, LAB_INSTRUMENT_SETTINGS as settings } from "../../LockInAmplifierConstants.js";

export const lab = instrumentStrings.lab;
export const labA11y = StringManager.getInstance().getVirtualExperimentA11yStrings();
export const labLabelFont = new PhetFont(layout.LABEL_SIZE);
export const labHeadingFont = new PhetFont({ size: layout.HEADING_SIZE, weight: "bold" });
export const scenarioLabels = {
  choppedLight: lab.choppedLightStringProperty,
  bridge: lab.bridgeStringProperty,
  rcFilter: lab.rcFilterStringProperty,
};
export const sampleLabels = {
  none: lab.noneStringProperty,
  A: lab.sampleAStringProperty,
  B: lab.sampleBStringProperty,
  C: lab.sampleCStringProperty,
};

const units = instrumentStrings.units;

function voltageUnit(scale: number): { multiplier: number; pattern: TReadOnlyProperty<string> } {
  if (scale < 1e-3) {
    return { multiplier: 1e6, pattern: lab.microvoltsStringProperty };
  }
  return scale < 1
    ? { multiplier: 1e3, pattern: units.millivoltsStringProperty }
    : { multiplier: 1, pattern: units.voltsStringProperty };
}

export function voltageDetents(values: readonly number[]) {
  return values.map((value) => {
    const { multiplier, pattern } = voltageUnit(value);
    return {
      value,
      stringProperty: new DerivedProperty([pattern], (text) => formatValue(text, value * multiplier, 0)),
    };
  });
}

/** The leading half digit can show 0 or 1, followed by four counts of resolution. */
export function voltageReadout(value: number, scale: number): string {
  const { multiplier, pattern } = voltageUnit(scale);
  const countsPerUnit = settings.DISPLAY_FULL_SCALE_COUNTS / scale;
  const counts = Math.max(
    -settings.DISPLAY_MAX_COUNTS,
    Math.min(settings.DISPLAY_MAX_COUNTS, roundSymmetric(value * countsPerUnit)),
  );
  const decimals = Math.ceil(Math.log10(countsPerUnit / multiplier));
  return formatValue(pattern.value, (counts * multiplier) / countsPerUnit, decimals);
}
