// Copied from OpenLyceum/Oscilloscope@8bfc5f9; adapted: theme, dimensions and accessibility for the lock-in front panel.
/**
 * RotarySwitch.ts
 *
 * A detented rotary selector — the multi-position switch a real oscilloscope
 * uses for volts/div, time/div, coupling, trigger source, and so on. It steps
 * through a fixed list of positions: the pointer snaps to the selected detent,
 * ticks mark every position around the dial, and a bold readout beneath shows
 * the current selection.
 *
 * Like {@link RotaryKnob} it is built on {@link AccessibleSlider} (over an internal
 * integer index), so arrow keys, Home/End and Page Up/Down all work and the
 * selection is announced to assistive technology. Turning the dial (relative
 * angular drag) clicks it from position to position. No slider UI is shown.
 */

import { DerivedProperty, NumberProperty, Property, type TProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { clamp, Range, roundSymmetric, Vector2 } from "scenerystack/dot";
import { optionize } from "scenerystack/phet-core";
import { Circle, DragListener, Line, Node, type NodeOptions, Text, type TPaint, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { AccessibleSlider, type AccessibleSliderOptions } from "scenerystack/sun";
import LockInAmplifierColors from "../../LockInAmplifierColors.js";
import { ROTARY_SETTINGS as metrics } from "../../LockInAmplifierConstants.js";
import { KNOB_SWEEP_RADIANS, knobAngleFromCenter, unwrapAngleDelta } from "./KnobDragListener.js";

type RotarySwitchItem<T> = {
  readonly value: T;
  readonly stringProperty: TReadOnlyProperty<string>;
};

type SelfOptions = {
  radius?: number;
  captionStringProperty?: TReadOnlyProperty<string> | null;
  textFill?: TPaint;
  /** Paint for the selected-position readout (defaults to {@link SelfOptions.textFill}). */
  readoutFill?: TPaint;
};

type ParentOptions = AccessibleSliderOptions &
  Pick<
    NodeOptions,
    "accessibleName" | "accessibleHelpText" | "enabledProperty" | "visibleProperty" | "cursor" | "scale"
  >;

type RotarySwitchOptions = SelfOptions &
  Pick<
    ParentOptions,
    "accessibleName" | "accessibleHelpText" | "enabledProperty" | "visibleProperty" | "cursor" | "scale"
  >;

const AccessibleSliderNode = AccessibleSlider(Node, 0);

export class RotarySwitch<T> extends AccessibleSliderNode {
  private readonly disposeRotarySwitch: () => void;

  public constructor(
    property: TProperty<T>,
    items: readonly RotarySwitchItem<T>[],
    providedOptions?: RotarySwitchOptions,
  ) {
    const count = items.length;
    const maxIndex = Math.max(0, count - 1);

    const indexForValue = (value: T): number => {
      const i = items.findIndex((item) => item.value === value);
      return Math.max(i, 0);
    };

    const indexProperty = new NumberProperty(indexForValue(property.value), {
      range: new Range(0, maxIndex),
    });
    const enabledRangeProperty = new Property(new Range(0, maxIndex));

    const options = optionize<RotarySwitchOptions, SelfOptions, ParentOptions>()(
      {
        radius: metrics.RADIUS,
        captionStringProperty: null,
        textFill: LockInAmplifierColors.textColorProperty,
        readoutFill: LockInAmplifierColors.textColorProperty,
        // AccessibleSlider, over the switch's internal detent index:
        valueProperty: indexProperty,
        enabledRangeProperty,
        keyboardStep: 1,
        shiftKeyboardStep: 1,
        pageKeyboardStep: Math.max(1, Math.floor(count / 4)),
        constrainValue: (value: number) => clamp(roundSymmetric(value), 0, maxIndex),
        roundToStepSize: true,
        pdomDependencies: items.map(({ stringProperty }) => stringProperty),
        pdomCreateAriaValueText: (index) => items[roundSymmetric(index ?? 0)]?.stringProperty.value ?? "",
        cursor: "pointer",
      },
      providedOptions,
    );

    const { radius, captionStringProperty, textFill, readoutFill } = options;

    super(options);

    // ── Dial body ─────────────────────────────────────────────────────────────
    const body = new Circle(radius, {
      fill: LockInAmplifierColors.knobBodyColorProperty,
      stroke: LockInAmplifierColors.knobRimColorProperty,
      lineWidth: metrics.RIM_WIDTH,
    });
    const innerDisc = new Circle(radius * metrics.INNER_DISC_RATIO, {
      fill: LockInAmplifierColors.knobRimColorProperty,
      opacity: metrics.INNER_DISC_OPACITY,
    });

    // A detent tick for every position.
    const tickChildren: Node[] = [];
    for (let i = 0; i < count; i++) {
      const fraction = count <= 1 ? 0.5 : i / maxIndex;
      const rad = (fraction - 0.5) * metrics.SWEEP;
      const inner = radius + metrics.TICK_START;
      const outer = radius + metrics.TICK_END;
      tickChildren.push(
        new Line(Math.sin(rad) * inner, -Math.cos(rad) * inner, Math.sin(rad) * outer, -Math.cos(rad) * outer, {
          stroke: LockInAmplifierColors.knobIndicatorColorProperty,
          lineWidth: metrics.TICK_WIDTH,
        }),
      );
    }

    const indicator = new Line(0, 0, 0, -(radius - metrics.POINTER_INSET), {
      stroke: LockInAmplifierColors.knobIndicatorColorProperty,
      lineWidth: metrics.POINTER_WIDTH,
      lineCap: "round",
    });

    const dial = new Node({ children: [body, innerDisc, ...tickChildren, indicator] });
    dial.mouseArea = dial.localBounds.dilated(metrics.MOUSE_INSET);
    dial.touchArea = dial.localBounds.dilated(metrics.TOUCH_INSET);

    // ── Caption + selected-position readout ───────────────────────────────────
    const readoutStringProperty = DerivedProperty.deriveAny(
      [indexProperty, ...items.map((item) => item.stringProperty)],
      () => {
        const i = clamp(roundSymmetric(indexProperty.value), 0, maxIndex);
        return items[i]?.stringProperty.value ?? "";
      },
    );

    const labelChildren: Node[] = [dial];
    if (captionStringProperty) {
      labelChildren.push(
        new Text(captionStringProperty, {
          font: new PhetFont(metrics.LABEL_SIZE),
          fill: textFill,
          maxWidth: radius * 3.4,
        }),
      );
    }
    labelChildren.push(
      new Text(readoutStringProperty, {
        font: new PhetFont({ size: metrics.VALUE_SIZE, weight: "bold" }),
        fill: readoutFill,
        maxWidth: radius * 3.6,
      }),
    );
    this.addChild(new VBox({ spacing: metrics.LABEL_GAP, children: labelChildren }));

    // ── Keep the model value, index, and pointer in sync ──────────────────────
    let syncing = false;
    const updatePointer = (index: number): void => {
      const fraction = count <= 1 ? 0.5 : clamp(index, 0, maxIndex) / maxIndex;
      indicator.rotation = (fraction - 0.5) * metrics.SWEEP;
    };

    const indexListener = (rawIndex: number): void => {
      const index = clamp(roundSymmetric(rawIndex), 0, maxIndex);
      updatePointer(index);
      if (!syncing) {
        syncing = true;
        property.value = items[index]?.value ?? property.value;
        syncing = false;
      }
    };
    indexProperty.link(indexListener);

    const propertyListener = (value: T): void => {
      if (syncing) {
        return;
      }
      syncing = true;
      indexProperty.value = indexForValue(value);
      syncing = false;
    };
    property.link(propertyListener);

    // ── Pointer turn: angular drag advances the dial detent by detent ─────────
    // Keyboard stepping is owned by AccessibleSlider (arrows / Home / End / Page);
    // RichDragListener would double-bind those keys, so this stays pointer-only.
    // Match the visual tick spacing when detents are dense; cap at ~30° so
    // 2–3 position switches (source, coupling, …) do not need a half-turn.
    const detentRadians = maxIndex === 0 ? KNOB_SWEEP_RADIANS : KNOB_SWEEP_RADIANS / maxIndex;
    const stepRadians = Math.min(detentRadians, metrics.MAX_DETENT_STEP);
    let prevAngle = 0;
    let hasAngle = false;
    let accum = 0;
    const setIndex = (index: number): void => {
      indexProperty.value = clamp(index, 0, maxIndex);
    };
    const centerOf = (): Vector2 => dial.localToGlobalPoint(new Vector2(0, 0));
    const dragListener = new DragListener({
      start: (event) => {
        accum = 0;
        const center = centerOf();
        const point = event.pointer.point;
        if (point.distance(center) < metrics.DEAD_ZONE) {
          hasAngle = false;
          return;
        }
        prevAngle = knobAngleFromCenter(center, point);
        hasAngle = true;
      },
      drag: (event) => {
        const center = centerOf();
        const point = event.pointer.point;
        if (point.distance(center) < metrics.DEAD_ZONE) {
          hasAngle = false;
          return;
        }
        const angle = knobAngleFromCenter(center, point);
        if (!hasAngle) {
          prevAngle = angle;
          hasAngle = true;
          return;
        }
        accum += unwrapAngleDelta(prevAngle, angle);
        prevAngle = angle;
        while (accum >= stepRadians) {
          accum -= stepRadians;
          setIndex(roundSymmetric(indexProperty.value) + 1);
        }
        while (accum <= -stepRadians) {
          accum += stepRadians;
          setIndex(roundSymmetric(indexProperty.value) - 1);
        }
      },
    });
    dial.addInputListener(dragListener);

    this.disposeRotarySwitch = () => {
      indexProperty.unlink(indexListener);
      property.unlink(propertyListener);
      readoutStringProperty.dispose();
      dial.removeInputListener(dragListener);
      dragListener.dispose();
      enabledRangeProperty.dispose();
      indexProperty.dispose();
    };
  }

  public override dispose(): void {
    this.disposeRotarySwitch();
    super.dispose();
  }
}
