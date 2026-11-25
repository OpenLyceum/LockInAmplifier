/**
 * LockInAmplifierPanel.ts
 *
 * A pre-themed Panel that automatically uses LockInAmplifierColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { LockInAmplifierPanel } from "../../common/LockInAmplifierPanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new LockInAmplifierPanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new LockInAmplifierPanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new LockInAmplifierPanel(content, { fill: "transparent" });
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { Node } from "scenerystack/scenery";
import { Panel, type PanelOptions } from "scenerystack/sun";
import LockInAmplifierColors from "../LockInAmplifierColors.js";
import { PANEL_CORNER_RADIUS } from "../LockInAmplifierConstants.js";

/** @public */
export type LockInAmplifierPanelOptions = PanelOptions;

/** Pre-themed Panel wrapper for control panels and info boxes. @public */
export class LockInAmplifierPanel extends Panel {
  public constructor(content: Node, providedOptions?: LockInAmplifierPanelOptions) {
    const options = optionize<LockInAmplifierPanelOptions, EmptySelfOptions, PanelOptions>()(
      {
        fill: LockInAmplifierColors.panelBackgroundColorProperty,
        stroke: LockInAmplifierColors.panelBorderColorProperty,
        cornerRadius: PANEL_CORNER_RADIUS,
        xMargin: 12,
        yMargin: 10,
      },
      providedOptions,
    );
    super(content, options);
  }
}
