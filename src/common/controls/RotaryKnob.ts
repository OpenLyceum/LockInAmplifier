// Copied from OpenLyceum/Oscilloscope@8bfc5f9; adapted: theme, dimensions and accessibility for the lock-in front panel.
/**
 * RotaryKnob.ts
 *
 * A continuous rotary knob — the workhorse control of a real oscilloscope's
 * front panel. It replaces the usual on-screen slider: the user grabs the knob
 * and turns it (relative angular drag around the dial centre), and the
 * pointer indicator rotates through a 270° sweep to show the value.
 *
 * Accessibility comes for free: the knob mixes in {@link AccessibleSlider}, so it
 * is keyboard-operable (arrow keys step the value, Page Up/Down for coarse steps,
 * Home/End for the extremes) and announces its value to assistive technology.
 * The look is a knob, not a slider track — no slider UI on screen.
 */

import { Property, type TProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Range } from "scenerystack/dot";
import { optionize } from "scenerystack/phet-core";
import { Circle, Line, Node, type NodeOptions, Text, type TPaint, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { AccessibleSlider, type AccessibleSliderOptions } from "scenerystack/sun";
import LockInAmplifierColors from "../../LockInAmplifierColors.js";
import { ROTARY_SETTINGS as metrics } from "../../LockInAmplifierConstants.js";
import { KnobDragListener } from "./KnobDragListener.js";

type SelfOptions = {
  /** Radius of the knob body, in pixels. */
  radius?: number;
  /** Caption drawn beneath the knob. */
  captionStringProperty?: TReadOnlyProperty<string> | null;
  /** Live value readout drawn beneath the caption. */
  valueStringProperty?: TReadOnlyProperty<string> | null;
  /** Color of the caption / readout text. */
  textFill?: TPaint;
};

type ParentOptions = AccessibleSliderOptions &
  Pick<NodeOptions, "accessibleName" | "accessibleHelpText" | "enabledProperty" | "visibleProperty" | "cursor">;

type RotaryKnobOptions = SelfOptions &
  Pick<
    ParentOptions,
    | "accessibleName"
    | "accessibleHelpText"
    | "enabledProperty"
    | "visibleProperty"
    | "keyboardStep"
    | "shiftKeyboardStep"
    | "pageKeyboardStep"
    | "pdomCreateAriaValueText"
    | "pdomDependencies"
  >;

// AccessibleSlider trait mixed into Node; options are the first constructor arg.
const AccessibleSliderNode = AccessibleSlider(Node, 0);

export class RotaryKnob extends AccessibleSliderNode {
  private readonly disposeRotaryKnob: () => void;

  public constructor(valueProperty: TProperty<number>, range: Range, providedOptions?: RotaryKnobOptions) {
    const length = range.getLength();
    const enabledRangeProperty = new Property(range);

    const options = optionize<RotaryKnobOptions, SelfOptions, ParentOptions>()(
      {
        radius: metrics.RADIUS,
        captionStringProperty: null,
        valueStringProperty: null,
        textFill: LockInAmplifierColors.textColorProperty,
        // AccessibleSlider:
        valueProperty,
        enabledRangeProperty,
        keyboardStep: length * metrics.KEY_STEP,
        shiftKeyboardStep: length * metrics.FINE_KEY_STEP,
        pageKeyboardStep: length * metrics.PAGE_KEY_STEP,
        cursor: "pointer",
      },
      providedOptions,
    );

    const { radius, captionStringProperty, valueStringProperty, textFill } = options;

    super(options);

    // ── Knob body ─────────────────────────────────────────────────────────────
    const body = new Circle(radius, {
      fill: LockInAmplifierColors.knobBodyColorProperty,
      stroke: LockInAmplifierColors.knobRimColorProperty,
      lineWidth: metrics.RIM_WIDTH,
    });

    // Faint inner disc for a machined-metal feel.
    const innerDisc = new Circle(radius * metrics.INNER_DISC_RATIO, {
      fill: LockInAmplifierColors.knobRimColorProperty,
      opacity: metrics.INNER_DISC_OPACITY,
    });

    // Start / end detent ticks so the sweep limits read clearly.
    const tickAt = (fraction: number): Line => {
      const rad = (fraction - 0.5) * metrics.SWEEP;
      const inner = radius + metrics.TICK_START;
      const outer = radius + metrics.TICK_END;
      return new Line(Math.sin(rad) * inner, -Math.cos(rad) * inner, Math.sin(rad) * outer, -Math.cos(rad) * outer, {
        stroke: LockInAmplifierColors.knobIndicatorColorProperty,
        lineWidth: metrics.TICK_WIDTH,
      });
    };

    // ── Pointer indicator (rotates with the value) ────────────────────────────
    const indicator = new Line(0, 0, 0, -(radius - metrics.POINTER_INSET), {
      stroke: LockInAmplifierColors.knobIndicatorColorProperty,
      lineWidth: metrics.POINTER_WIDTH,
      lineCap: "round",
    });

    const knob = new Node({
      children: [body, innerDisc, ...[0, 0.25, 0.5, 0.75, 1].map(tickAt), indicator],
    });
    // Dial faces are small (~40 px across); inflate the pick target so they are
    // easy to grab without hunting for the rim.
    knob.mouseArea = knob.localBounds.dilated(metrics.MOUSE_INSET);
    knob.touchArea = knob.localBounds.dilated(metrics.TOUCH_INSET);

    // ── Caption + live readout ────────────────────────────────────────────────
    const labelChildren: Node[] = [knob];
    if (captionStringProperty) {
      labelChildren.push(
        new Text(captionStringProperty, {
          font: new PhetFont(metrics.LABEL_SIZE),
          fill: textFill,
          maxWidth: radius * 3,
        }),
      );
    }
    if (valueStringProperty) {
      labelChildren.push(
        new Text(valueStringProperty, {
          font: new PhetFont({ size: metrics.LABEL_SIZE, weight: "bold" }),
          fill: textFill,
          maxWidth: radius * 3.4,
        }),
      );
    }
    this.addChild(new VBox({ spacing: metrics.LABEL_GAP, children: labelChildren }));

    // Rotate the indicator to reflect the value.
    const updateIndicator = (value: number) => {
      const fraction = length === 0 ? 0 : (value - range.min) / length;
      indicator.rotation = (fraction - 0.5) * metrics.SWEEP;
    };
    valueProperty.link(updateIndicator);

    // ── Pointer turn interaction (relative angle about the dial centre) ───────
    const dragListener = new KnobDragListener(valueProperty, range, knob);
    knob.addInputListener(dragListener);

    this.disposeRotaryKnob = () => {
      valueProperty.unlink(updateIndicator);
      knob.removeInputListener(dragListener);
      dragListener.dispose();
      enabledRangeProperty.dispose();
    };
  }

  public override dispose(): void {
    this.disposeRotaryKnob();
    super.dispose();
  }
}
