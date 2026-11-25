// Copied from OpenLyceum/Oscilloscope@848aaa9; adapted: use phase settings and keep geometry helpers private.
import type { TProperty } from "scenerystack/axon";
import type { Range } from "scenerystack/dot";
import { Vector2 } from "scenerystack/dot";
import { DragListener, type Node } from "scenerystack/scenery";
import { PHASE_SETTINGS as settings } from "../../LockInAmplifierConstants.js";

/**
 * Angle of `point` about `center`, in radians: 0 at 12 o'clock, increasing
 * clockwise (matches the knob indicator's rotation convention).
 */
function knobAngleFromCenter(center: Vector2, point: Vector2): number {
  return Math.atan2(point.x - center.x, center.y - point.y);
}

/**
 * Smallest signed turn from `from` to `to`, in (−π, π]. Unwraps the ±π
 * discontinuity of {@link knobAngleFromCenter}.
 */
function unwrapAngleDelta(from: number, to: number): number {
  let delta = to - from;
  if (delta > Math.PI) {
    delta -= 2 * Math.PI;
  } else if (delta < -Math.PI) {
    delta += 2 * Math.PI;
  }
  return delta;
}

export class KnobDragListener extends DragListener {
  public constructor(valueProperty: TProperty<number>, range: Range, dial: Node) {
    const perRadian = range.getLength() / settings.KNOB_SWEEP;
    let prevAngle = 0;
    let hasAngle = false;

    const centerOf = (): Vector2 => dial.localToGlobalPoint(new Vector2(0, 0));

    super({
      start: (event) => {
        const center = centerOf();
        const point = event.pointer.point;
        if (point.distance(center) < settings.KNOB_DRAG_DEAD_ZONE) {
          hasAngle = false;
          return;
        }
        prevAngle = knobAngleFromCenter(center, point);
        hasAngle = true;
      },
      drag: (event) => {
        const center = centerOf();
        const point = event.pointer.point;
        if (point.distance(center) < settings.KNOB_DRAG_DEAD_ZONE) {
          hasAngle = false;
          return;
        }
        const angle = knobAngleFromCenter(center, point);
        if (!hasAngle) {
          prevAngle = angle;
          hasAngle = true;
          return;
        }
        const delta = unwrapAngleDelta(prevAngle, angle);
        prevAngle = angle;
        const next = valueProperty.value + delta * perRadian;
        valueProperty.value = Math.max(range.min, Math.min(range.max, next));
      },
    });
  }
}
