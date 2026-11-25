/** Screen motifs drawn in a common coordinate space for home and navigation. */
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle, type TColor } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import Colors from "../LockInAmplifierColors.js";
import { ICON_SETTINGS as settings } from "../LockInAmplifierConstants.js";

function line(shape: Shape, stroke: TColor, opacity = 1): Path {
  return new Path(shape, { stroke, opacity, lineWidth: settings.STROKE, lineCap: "round", lineJoin: "round" });
}

function iconFrom(...children: Node[]): ScreenIcon {
  return new ScreenIcon(
    new Node({
      children: [
        new Rectangle(0, 0, settings.WIDTH, settings.HEIGHT, { fill: Colors.backgroundColorProperty }),
        ...children,
      ],
    }),
    {
      maxIconWidthProportion: 1,
      maxIconHeightProportion: 1,
      fill: Colors.backgroundColorProperty,
    },
  );
}

function wave(left: number, right: number, center: number, amplitude: number, noisy = false): Shape {
  const shape = new Shape();
  for (let i = 0; i <= settings.WAVE_SAMPLES; i++) {
    const t = i / settings.WAVE_SAMPLES;
    const x = left + t * (right - left);
    const perturbation = noisy ? 0.48 * Math.sin(91 * t) + 0.28 * Math.cos(153 * t) : 0;
    const y = center - amplitude * (Math.sin(4 * Math.PI * t) + perturbation);
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  return shape;
}

export function createSignalAndNoiseIcon(): ScreenIcon {
  return iconFrom(
    line(wave(10, 110, 41, 19), Colors.cleanTraceColorProperty, 0.55),
    line(wave(10, 110, 41, 19, true), Colors.inputTraceColorProperty),
  );
}

export function createMixingIcon(): ScreenIcon {
  return iconFrom(
    line(wave(9, 53, 24, 7), Colors.inputTraceColorProperty),
    line(wave(9, 53, 58, 7), Colors.referenceTraceColorProperty),
    line(
      new Shape().moveTo(53, 24).lineTo(66, 32).moveTo(53, 58).lineTo(66, 50).moveTo(98, 41).lineTo(111, 41),
      Colors.axisColorProperty,
    ),
    line(
      new Shape().circle(81, 41, 17).moveTo(73, 33).lineTo(89, 49).moveTo(89, 33).lineTo(73, 49),
      Colors.productTraceColorProperty,
    ),
  );
}

export function createFilteringIcon(): ScreenIcon {
  return iconFrom(
    line(new Shape().moveTo(15, 14).lineTo(15, 67).lineTo(109, 67), Colors.axisColorProperty),
    line(
      new Shape().moveTo(20, 23).lineTo(47, 23).cubicCurveTo(67, 23, 73, 36, 84, 46).lineTo(106, 62),
      Colors.outputTraceColorProperty,
    ),
  );
}

export function createPhaseDetectionIcon(): ScreenIcon {
  return iconFrom(
    line(new Shape().moveTo(20, 55).lineTo(107, 55).moveTo(48, 69).lineTo(48, 13), Colors.axisColorProperty),
    line(
      new Shape().moveTo(48, 55).lineTo(92, 22).moveTo(80, 23).lineTo(92, 22).lineTo(87, 34),
      Colors.outputTraceColorProperty,
    ),
    line(new Shape().arc(48, 55, 24, -Math.atan2(33, 44), 0), Colors.quadratureTraceColorProperty),
  );
}

export function createVirtualExperimentIcon(): ScreenIcon {
  return iconFrom(
    line(new Shape().roundRect(10, 15, 100, 52, 6, 6), Colors.axisColorProperty),
    line(new Shape().circle(34, 42, 14).moveTo(34, 42).lineTo(42, 33), Colors.referenceTraceColorProperty),
    line(
      new Shape().roundRect(58, 27, 38, 29, 3, 3).moveTo(65, 42).quadraticCurveTo(77, 33, 89, 42),
      Colors.axisColorProperty,
    ),
    line(new Shape().moveTo(77, 49).lineTo(86, 38), Colors.outputTraceColorProperty),
  );
}
