/** Probe selection over a signal-flow diagram with optional quadrature branch. */
import type { Property } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle } from "scenerystack/scenery";
import { RectangularPushButton } from "scenerystack/sun";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../LockInAmplifierColors.js";
import { P2_LAYOUT_SETTINGS as metrics, PANEL_CORNER_RADIUS } from "../../LockInAmplifierConstants.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../LockInAmplifierButtonOptions.js";
import { DisposalBag } from "./DisposalBag.js";
import { instrumentStrings, instrumentText } from "./instrumentText.js";

export const Probe = {
  INPUT: "input",
  REFERENCE: "reference",
  PRODUCT: "product",
  FILTER: "filter",
  OUTPUT: "output",
  QUADRATURE: "quadrature",
} as const;
export type Probe = (typeof Probe)[keyof typeof Probe];

const labels = instrumentStrings.controls;
const names = StringManager.getInstance().getMixingA11yStrings().probes;
const blocks = [
  {
    probe: Probe.INPUT,
    label: labels.inputBlockStringProperty,
    name: names.inputStringProperty,
    color: Colors.inputTraceColorProperty,
  },
  {
    probe: Probe.REFERENCE,
    label: labels.referenceBlockStringProperty,
    name: names.referenceStringProperty,
    color: Colors.referenceTraceColorProperty,
  },
  {
    probe: Probe.PRODUCT,
    label: labels.mixerBlockStringProperty,
    name: names.productStringProperty,
    color: Colors.productTraceColorProperty,
  },
  {
    probe: Probe.FILTER,
    label: labels.filterBlockStringProperty,
    name: names.filterStringProperty,
    color: Colors.outputTraceColorProperty,
  },
  {
    probe: Probe.OUTPUT,
    label: labels.xBlockStringProperty,
    name: names.outputStringProperty,
    color: Colors.outputTraceColorProperty,
  },
  {
    probe: Probe.QUADRATURE,
    label: labels.yBlockStringProperty,
    name: names.quadratureStringProperty,
    color: Colors.quadratureTraceColorProperty,
  },
] as const;

export class BlockDiagramNode extends Node {
  private readonly bag = new DisposalBag();

  public constructor(probeProperty: Property<Probe>, width: number, options?: { dual?: boolean }) {
    super();
    const middle = metrics.DIAGRAM_HEIGHT / 2;
    const [inputColumn, productColumn, filterColumn, outputColumn] = metrics.DIAGRAM_COLUMN_FRACTIONS;
    const cols = [width * inputColumn, width * productColumn, width * filterColumn, width * outputColumn] as const;
    const upper = middle / 2;
    const lower = middle + upper;
    const positions = [
      [cols[0], upper],
      [cols[0], lower],
      [cols[1], middle],
      [cols[2], middle],
      [cols[3], options?.dual ? upper : middle],
      [cols[3], lower],
    ] as const;
    const half = metrics.DIAGRAM_BLOCK_WIDTH / 2;
    const background = new Rectangle(0, 0, width, metrics.DIAGRAM_HEIGHT, {
      cornerRadius: PANEL_CORNER_RADIUS,
      fill: Colors.panelBackgroundColorProperty,
      stroke: Colors.chartBorderColorProperty,
    });
    const lines = new Shape();
    const connect = (from: number, y: number, to: number, targetY: number): void => {
      const size = metrics.DIAGRAM_ARROW_SIZE;
      const elbow = (from + to) / 2;
      lines
        .moveTo(from, y)
        .lineTo(elbow, y)
        .lineTo(elbow, targetY)
        .lineTo(to, targetY)
        .moveTo(to - size, targetY - size)
        .lineTo(to, targetY)
        .lineTo(to - size, targetY + size);
    };
    connect(cols[0] + half, upper, cols[1] - half, middle);
    connect(cols[0] + half, lower, cols[1] - half, middle);
    connect(cols[1] + half, middle, cols[2] - half, middle);
    connect(cols[2] + half, middle, cols[3] - half, options?.dual ? upper : middle);
    if (options?.dual) {
      connect(cols[2] + half, middle, cols[3] - half, lower);
    }
    const connectors = new Path(lines, { stroke: Colors.axisColorProperty });
    this.addChild(background);
    this.addChild(connectors);
    this.bag.own(background, connectors);

    blocks.forEach((block, index) => {
      const position = positions[index];
      if (!position || (block.probe === Probe.QUADRATURE && !options?.dual)) {
        return;
      }
      const [x, y] = position;
      const split = index < 2 || (options?.dual && index >= 4);
      const caption = instrumentText(block.label, {
        fill: block.color,
        maxWidth: metrics.DIAGRAM_BLOCK_WIDTH - metrics.GAP,
      });
      const button = new RectangularPushButton({
        ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
        content: caption,
        minWidth: metrics.DIAGRAM_BLOCK_WIDTH,
        minHeight: split ? metrics.DIAGRAM_HEIGHT / 2 - metrics.GAP / 2 : metrics.DIAGRAM_BLOCK_HEIGHT,
        xMargin: 0,
        yMargin: 0,
        cornerRadius: PANEL_CORNER_RADIUS,
        baseColor: Colors.chartBackgroundColorProperty,
        stroke: Colors.chartBorderColorProperty,
        accessibleName: block.name,
        listener: () => {
          probeProperty.value = block.probe;
        },
        centerX: x,
        centerY: y,
      });
      this.addChild(button);
      this.bag.own(button, caption);
      this.bag.link(probeProperty, (probe) => {
        const selected = probe === block.probe;
        button.baseColor = selected ? Colors.selectedBlockColorProperty : Colors.chartBackgroundColorProperty;
        button.setPDOMAttribute("aria-pressed", String(selected));
      });
    });
  }

  public override dispose(): void {
    this.bag.dispose();
    super.dispose();
  }
}
