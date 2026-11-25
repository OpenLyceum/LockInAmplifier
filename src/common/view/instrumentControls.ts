/** Consistent checkbox, selector, and accordion chrome used by the teaching screens. */
import { DerivedProperty, type PhetioProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { AlignBox, HBox, type Node } from "scenerystack/scenery";
import { AccordionBox, Checkbox, ComboBox } from "scenerystack/sun";
import Colors from "../../LockInAmplifierColors.js";
import {
  CONTROL_SETTINGS as metrics,
  P2_LAYOUT_SETTINGS,
  PANEL_CORNER_RADIUS,
} from "../../LockInAmplifierConstants.js";
import { LOCK_IN_AMPLIFIER_COMBO_BOX_OPTIONS } from "../LockInAmplifierButtonOptions.js";
import { formatValue, instrumentHeadingFont, instrumentText } from "./instrumentText.js";

export function instrumentCheckbox(
  property: PhetioProperty<boolean>,
  labelProperty: TReadOnlyProperty<string>,
  accessibleName: TReadOnlyProperty<string>,
): Checkbox {
  const label = instrumentText(labelProperty);
  const checkbox = new Checkbox(property, label, {
    accessibleName,
    boxWidth: metrics.CHECKBOX_SIZE,
    checkboxColor: Colors.controlSurfaceTextColorProperty,
    checkboxColorBackground: Colors.controlSurfaceColorProperty,
  });
  checkbox.disposeEmitter.addListener(() => label.dispose());
  return checkbox;
}

export function instrumentCombo<T>(
  property: PhetioProperty<T>,
  choices: readonly { value: T; labelProperty: TReadOnlyProperty<string> }[],
  listParent: Node,
  accessibleName: TReadOnlyProperty<string>,
  listPosition: "above" | "below" = "below",
): ComboBox<T> {
  return new ComboBox(
    property,
    choices.map(({ value, labelProperty }) => ({
      value,
      accessibleName: labelProperty,
      createNode: () => instrumentText(labelProperty, { fill: Colors.controlSurfaceTextColorProperty }),
    })),
    listParent,
    {
      ...LOCK_IN_AMPLIFIER_COMBO_BOX_OPTIONS,
      accessibleName,
      listPosition,
      highlightFill: Colors.badgeBackgroundColorProperty,
      xMargin: metrics.CONTENT_GAP,
      yMargin: metrics.FIELD_INSET / 2,
    },
  );
}

export function numberChoices(
  values: readonly number[],
  patternProperty: TReadOnlyProperty<string>,
  convert: (value: number) => number = (value) => value,
  decimals = 0,
): { value: number; labelProperty: TReadOnlyProperty<string> }[] {
  return values.map((value) => ({
    value,
    labelProperty: new DerivedProperty([patternProperty], (pattern) =>
      formatValue(pattern, convert(value), decimals, true),
    ),
  }));
}

export function controlRow(labelProperty: TReadOnlyProperty<string>, control: Node): HBox {
  const label = new AlignBox(instrumentText(labelProperty), {
    xAlign: "left",
    preferredWidth: metrics.LABEL_WIDTH,
  });
  return new HBox({ spacing: metrics.CONTENT_GAP, children: [label, control] });
}

export function instrumentAccordion(titleProperty: TReadOnlyProperty<string>, content: Node): AccordionBox {
  return new AccordionBox(content, {
    titleNode: instrumentText(titleProperty, { font: instrumentHeadingFont }),
    accessibleName: titleProperty,
    expandedDefaultValue: true,
    fill: Colors.panelBackgroundColorProperty,
    stroke: Colors.chartBorderColorProperty,
    cornerRadius: PANEL_CORNER_RADIUS,
    minWidth: P2_LAYOUT_SETTINGS.CONTROL_WIDTH,
    titleAlignX: "left",
    buttonAlign: "right",
    contentAlign: "left",
    contentXMargin: metrics.ACCORDION_MARGIN,
    contentYMargin: metrics.ACCORDION_MARGIN,
    contentYSpacing: metrics.ACCORDION_MARGIN / 2,
    buttonXMargin: metrics.ACCORDION_MARGIN,
    buttonYMargin: metrics.ACCORDION_MARGIN / 2,
    titleYMargin: metrics.ACCORDION_MARGIN / 2,
    titleXMargin: metrics.ACCORDION_MARGIN,
    expandCollapseButtonOptions: { sideLength: metrics.CHECKBOX_SIZE },
  });
}
