// Copied from OpenLyceum/Oscilloscope@848aaa9; adapted: phase keyboard increments, a localized degree readout, and profile-aware styling.
import { type NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Circle, Line, Node, type NodeOptions } from "scenerystack/scenery";
import { AccessibleSlider, type AccessibleSliderOptions } from "scenerystack/sun";
import { DisposalBag } from "../../common/view/DisposalBag.js";
import { formatValue, instrumentStrings } from "../../common/view/instrumentText.js";
import Colors from "../../LockInAmplifierColors.js";
import { PHASE_SETTINGS as settings } from "../../LockInAmplifierConstants.js";
import { KnobDragListener } from "./KnobDragListener.js";

const AccessibleSliderNode = AccessibleSlider(Node, 0);

export class RotaryKnob extends AccessibleSliderNode {
  private readonly bag = new DisposalBag();

  public constructor(valueProperty: NumberProperty, name: TReadOnlyProperty<string>, help: TReadOnlyProperty<string>) {
    const range = valueProperty.range;
    const enabledRangeProperty = new Property(range);
    const degrees = instrumentStrings.units.degreesStringProperty;
    const options: AccessibleSliderOptions & NodeOptions = {
      valueProperty,
      enabledRangeProperty,
      accessibleName: name,
      accessibleHelpText: help,
      keyboardStep: settings.PHASE_STEP,
      shiftKeyboardStep: settings.PHASE_STEP,
      pageKeyboardStep: settings.COARSE_PHASE_STEP,
      pdomDependencies: [degrees],
      pdomCreateAriaValueText: (radians) => formatValue(degrees.value, (radians ?? 0) / settings.PHASE_STEP, 0),
      cursor: "pointer",
    };
    super(options);
    const radius = settings.KNOB_RADIUS;
    const body = new Circle(radius, {
      fill: Colors.controlSurfaceColorProperty,
      stroke: Colors.axisColorProperty,
      lineWidth: 2,
    });
    const innerDisc = new Circle(radius * 0.6, { fill: Colors.axisColorProperty, opacity: 0.25 });
    const tickAt = (angle: number): Line => {
      const inner = radius + settings.KNOB_TICK_START;
      const outer = radius + settings.KNOB_TICK_END;
      return new Line(
        Math.sin(angle) * inner,
        -Math.cos(angle) * inner,
        Math.sin(angle) * outer,
        -Math.cos(angle) * outer,
        {
          stroke: Colors.axisColorProperty,
          lineWidth: 1.5,
        },
      );
    };
    const indicator = new Line(0, 0, 0, -(radius - settings.KNOB_POINTER_INSET), {
      stroke: Colors.controlSurfaceTextColorProperty,
      lineWidth: 3,
      lineCap: "round",
    });
    const start = -settings.KNOB_SWEEP / 2;
    const knob = new Node({ children: [body, innerDisc, tickAt(start), tickAt(-start), indicator] });
    knob.mouseArea = knob.localBounds.dilated(settings.KNOB_MOUSE_INSET);
    knob.touchArea = knob.localBounds.dilated(settings.KNOB_TOUCH_INSET);
    this.addChild(knob);
    this.bag.own(enabledRangeProperty);
    this.bag.add(() => knob.disposeSubtree());
    this.bag.link(valueProperty, (value) => {
      indicator.rotation = start + (settings.KNOB_SWEEP * (value - range.min)) / range.getLength();
    });
    const listener = new KnobDragListener(valueProperty, range, knob);
    knob.addInputListener(listener);
    this.bag.add(() => {
      knob.removeInputListener(listener);
      listener.dispose();
    });
  }

  public override dispose(): void {
    super.dispose();
    this.bag.dispose();
  }
}
