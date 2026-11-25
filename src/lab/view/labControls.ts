/** Accessible rotary control adapters for the Lab. */
import { DerivedProperty, type TProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Range } from "scenerystack/dot";
import { RotaryKnob } from "../../common/controls/RotaryKnob.js";
import { RotarySwitch } from "../../common/controls/RotarySwitch.js";
import { formatValue } from "../../common/view/instrumentText.js";
import { labA11y } from "./labText.js";

const names = labA11y.controls;

export function dial<T>(
  property: TProperty<T>,
  items: readonly { value: T; stringProperty: TReadOnlyProperty<string> }[],
  label: TReadOnlyProperty<string>,
  name: TReadOnlyProperty<string>,
  enabledProperty?: TReadOnlyProperty<boolean>,
  radius?: number,
): RotarySwitch<T> {
  return new RotarySwitch(property, items, {
    ...(radius === undefined ? {} : { radius }),
    captionStringProperty: label,
    accessibleName: name,
    accessibleHelpText: names.knobHelpStringProperty,
    ...(enabledProperty ? { enabledProperty } : {}),
  });
}

export function numericKnob(
  property: TProperty<number>,
  range: Range,
  label: TReadOnlyProperty<string>,
  name: TReadOnlyProperty<string>,
  pattern: TReadOnlyProperty<string>,
  convert: (value: number) => number,
  decimals: number,
  steps: Pick<
    NonNullable<ConstructorParameters<typeof RotaryKnob>[2]>,
    "keyboardStep" | "shiftKeyboardStep" | "pageKeyboardStep"
  >,
  enabledProperty?: TReadOnlyProperty<boolean>,
  help = names.knobHelpStringProperty,
): RotaryKnob {
  const valueText = (value: number) => formatValue(pattern.value, convert(value), decimals, true);
  return new RotaryKnob(property, range, {
    ...steps,
    captionStringProperty: label,
    valueStringProperty: new DerivedProperty([property, pattern], valueText),
    accessibleName: name,
    accessibleHelpText: help,
    pdomDependencies: [pattern],
    pdomCreateAriaValueText: (value) => valueText(value ?? property.value),
    ...(enabledProperty ? { enabledProperty } : {}),
  });
}
