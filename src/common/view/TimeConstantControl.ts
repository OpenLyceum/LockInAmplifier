/** A slider over the instrument's discrete time-constant settings. */
import type { NumberProperty, TReadOnlyProperty } from "scenerystack/axon";
import { Range, roundSymmetric } from "scenerystack/dot";
import { FILTER_SETTINGS } from "../../LockInAmplifierConstants.js";
import { formatValue, instrumentStrings } from "./instrumentText.js";
import { LockInAmplifierNumberControl } from "./LockInAmplifierNumberControl.js";

const TIME_CONSTANTS: readonly number[] = FILTER_SETTINGS.TIME_CONSTANTS;
const seconds = instrumentStrings.units.secondsStringProperty;
const milliseconds = instrumentStrings.units.millisecondsStringProperty;

export class TimeConstantControl extends LockInAmplifierNumberControl {
  public constructor(timeConstantProperty: NumberProperty, accessibleName: TReadOnlyProperty<string>) {
    const last = TIME_CONSTANTS.length - 1;
    super(
      instrumentStrings.controls.timeConstantStringProperty,
      timeConstantProperty,
      new Range(FILTER_SETTINGS.TIME_CONSTANTS[0], TIME_CONSTANTS[last] ?? FILTER_SETTINGS.TIME_CONSTANTS[0]),
      milliseconds,
      {
        accessibleName,
        delta: 1,
        mapping: {
          range: new Range(0, last),
          forward: (value) => TIME_CONSTANTS.indexOf(value),
          inverse: (index) => TIME_CONSTANTS[roundSymmetric(index)] ?? FILTER_SETTINGS.TIME_CONSTANTS[0],
        },
        valueFormatter: (value) =>
          value < 1 ? formatValue(milliseconds.value, value * 1000, 0) : formatValue(seconds.value, value, 0),
        extraFormattingDependencies: [seconds],
        sliderOptions: { pageKeyboardStep: 1 },
      },
    );
  }
}
