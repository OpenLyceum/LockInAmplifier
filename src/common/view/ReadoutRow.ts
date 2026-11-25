/** Label and right-aligned value badge for compact instrument readouts. */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { AlignBox, HBox } from "scenerystack/scenery";
import Colors from "../../LockInAmplifierColors.js";
import { CONTROL_SETTINGS as metrics } from "../../LockInAmplifierConstants.js";
import { LockInAmplifierPanel } from "../LockInAmplifierPanel.js";
import { DisposalBag } from "./DisposalBag.js";
import { chartLabelFont, instrumentText } from "./instrumentText.js";

export class ReadoutRow extends HBox {
  private readonly bag = new DisposalBag();

  public constructor(
    labelProperty: TReadOnlyProperty<string>,
    valueProperty: TReadOnlyProperty<string>,
    width: number,
  ) {
    const label = instrumentText(labelProperty, {
      font: chartLabelFont,
      maxWidth: width - metrics.READOUT_WIDTH - metrics.CONTENT_GAP,
    });
    const value = instrumentText(valueProperty, {
      font: chartLabelFont,
      maxWidth: metrics.READOUT_WIDTH - 2 * metrics.FIELD_INSET,
    });
    const badge = new LockInAmplifierPanel(value, {
      fill: Colors.badgeBackgroundColorProperty,
      stroke: null,
      xMargin: metrics.FIELD_INSET,
      yMargin: metrics.FIELD_INSET / 2,
      minWidth: metrics.READOUT_WIDTH,
      align: "right",
    });
    const aligned = new AlignBox(label, {
      xAlign: "left",
      preferredWidth: width - metrics.READOUT_WIDTH - metrics.CONTENT_GAP,
    });
    super({ spacing: metrics.CONTENT_GAP, children: [aligned, badge] });
    this.bag.own(badge, aligned, label, value);
  }

  public override dispose(): void {
    this.bag.dispose();
    super.dispose();
  }
}
