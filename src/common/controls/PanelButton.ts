// Copied from OpenLyceum/Oscilloscope@8bfc5f9; adapted: theme, dimensions and accessibility for the lock-in front panel.
/**
 * PanelButton.ts
 *
 * A front-panel push button, styled after the labelled buttons on a real
 * oscilloscope. It can act as a momentary action (Autoset, Single, Reset) or,
 * when given an `indicatorProperty`, as a toggle with a lit indicator LED
 * (Run/Stop, CH on/off, Invert, ×10, X-Y, …).
 *
 * The button itself remains a fully accessible sun `RectangularPushButton`, so it
 * is focusable and operable from the keyboard with a proper accessible name.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { optionize } from "scenerystack/phet-core";
import { Circle, HBox, Node, Text, type TPaint } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { RectangularPushButton, type RectangularPushButtonOptions } from "scenerystack/sun";
import LockInAmplifierColors from "../../LockInAmplifierColors.js";
import { LAB_LAYOUT_SETTINGS as metrics } from "../../LockInAmplifierConstants.js";
import { FLAT_BUTTON_APPEARANCE_OPTIONS } from "../LockInAmplifierButtonOptions.js";

type SelfOptions = {
  /** Button label. */
  labelStringProperty: TReadOnlyProperty<string> | string;
  /** When provided, the button shows an indicator LED that lights while this is true. */
  indicatorProperty?: TReadOnlyProperty<boolean> | null;
  /** Paint of the indicator LED when lit. */
  indicatorColor?: TPaint;
  /** Label text color. */
  textFill?: TPaint;
  /** Font size of the label. */
  fontSize?: number;
};

type PanelButtonOptions = SelfOptions &
  Pick<
    RectangularPushButtonOptions,
    "listener" | "accessibleName" | "accessibleHelpText" | "enabledProperty" | "visibleProperty" | "minWidth"
  >;

export class PanelButton extends RectangularPushButton {
  public constructor(providedOptions: PanelButtonOptions) {
    const options = optionize<PanelButtonOptions, SelfOptions, RectangularPushButtonOptions>()(
      {
        indicatorProperty: null,
        indicatorColor: LockInAmplifierColors.accentColorProperty,
        textFill: LockInAmplifierColors.controlSurfaceTextColorProperty,
        fontSize: metrics.KEY_FONT_SIZE,
        // RectangularPushButton:
        baseColor: LockInAmplifierColors.panelButtonColorProperty,
        cornerRadius: metrics.KEY_RADIUS,
        xMargin: metrics.KEY_INSET_X,
        yMargin: metrics.KEY_INSET_Y,
        ...FLAT_BUTTON_APPEARANCE_OPTIONS,
      },
      providedOptions,
    );

    const label = new Text(options.labelStringProperty, {
      font: new PhetFont({ size: options.fontSize, weight: "bold" }),
      fill: options.textFill,
      maxWidth: 120,
    });

    const rowChildren: Node[] = [];
    if (options.indicatorProperty) {
      const ledBase = new Circle(metrics.INDICATOR_RADIUS, { fill: LockInAmplifierColors.ledOffColorProperty });
      const ledLit = new Circle(metrics.INDICATOR_RADIUS, {
        fill: options.indicatorColor,
        visibleProperty: options.indicatorProperty,
      });
      rowChildren.push(new Node({ children: [ledBase, ledLit] }));
    }
    rowChildren.push(label);

    options.content = new HBox({ spacing: metrics.COMPACT_GAP, children: rowChildren });

    super(options);
  }
}
