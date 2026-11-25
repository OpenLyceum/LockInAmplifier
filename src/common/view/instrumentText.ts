/** Shared chart and control typography and localized numeric formatting. */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { toFixed, toFixedNumber } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { Text, type TextOptions } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../LockInAmplifierColors.js";
import { CHART_SETTINGS, CONTROL_SETTINGS } from "../../LockInAmplifierConstants.js";

export const instrumentStrings = StringManager.getInstance().getInstrumentStrings();
export const instrumentFont = new PhetFont(CONTROL_SETTINGS.FONT_SIZE);
export const instrumentHeadingFont = new PhetFont({ size: CONTROL_SETTINGS.HEADING_SIZE, weight: "bold" });
export const chartTitleFont = new PhetFont({ size: CHART_SETTINGS.TITLE_SIZE, weight: "bold" });
export const chartLabelFont = new PhetFont(CHART_SETTINGS.LABEL_SIZE);

export function instrumentText(value: string | TReadOnlyProperty<string>, options?: TextOptions): Text {
  return new Text(value, { font: instrumentFont, fill: Colors.textColorProperty, ...options });
}

/** Format a number using a unit pattern from StringManager. */
export function formatValue(pattern: string, value: number, decimals: number, trim = false): string {
  const units = instrumentStrings.units;
  if (Number.isNaN(value)) {
    return units.unavailableStringProperty.value;
  }
  const number = Number.isFinite(value)
    ? trim
      ? String(toFixedNumber(value, decimals))
      : toFixed(value, decimals)
    : value > 0
      ? units.infinityStringProperty.value
      : units.negativeInfinityStringProperty.value;
  return StringUtils.fillIn(pattern, { value: number });
}

export function valueStringProperty(
  valueProperty: TReadOnlyProperty<number>,
  patternProperty: TReadOnlyProperty<string>,
  decimals: number,
  multiplier = 1,
): TReadOnlyProperty<string> {
  return new DerivedProperty([valueProperty, patternProperty], (value, pattern) =>
    formatValue(pattern, value * multiplier, decimals),
  );
}
