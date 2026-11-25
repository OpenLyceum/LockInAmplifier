/** Layout for the three experiments, shared lock-in, and measurement notebook. */
import { Shape } from "scenerystack/kite";
import { AlignGroup, HBox, Node, Path } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/LockInAmplifierButtonOptions.js";
import Colors from "../../LockInAmplifierColors.js";
import { LAB_LAYOUT_SETTINGS as layout } from "../../LockInAmplifierConstants.js";
import type { VirtualExperimentModel } from "../model/VirtualExperimentModel.js";
import { LabApparatusNode } from "./LabApparatusNode.js";
import { LabNotebookNode } from "./LabNotebookNode.js";
import { LockInFrontPanelNode } from "./LockInFrontPanelNode.js";
import { VirtualExperimentScreenSummaryContent } from "./VirtualExperimentScreenSummaryContent.js";

export class VirtualExperimentScreenView extends ScreenView {
  private readonly apparatus: LabApparatusNode;
  private readonly frontPanel: LockInFrontPanelNode;

  public constructor(model: VirtualExperimentModel, options?: ScreenViewOptions) {
    super({ ...options, screenSummaryContent: new VirtualExperimentScreenSummaryContent(model) });
    const bounds = this.layoutBounds;
    const left = bounds.left + layout.MARGIN;
    const top = bounds.top + layout.MARGIN;
    const right = bounds.right - layout.MARGIN;
    const bottom = bounds.bottom - layout.MARGIN;
    const popupLayer = new Node();
    this.apparatus = new LabApparatusNode(model, popupLayer);
    const notebookWidth = right - left - this.apparatus.width - layout.GAP - 2 * layout.INSET;
    const notebook = new LabNotebookNode(model, notebookWidth);
    const upper = new AlignGroup({ matchHorizontal: false });
    const bench = new HBox({
      spacing: layout.GAP,
      children: [upper.createBox(this.apparatus, { yAlign: "top" }), upper.createBox(notebook, { yAlign: "top" })],
      left,
      top,
    });
    this.frontPanel = new LockInFrontPanelNode(model);
    this.frontPanel.left = left;
    this.frontPanel.top = top + layout.TOP_HEIGHT;
    const reset = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      radius: layout.RESET_RADIUS,
      right,
      bottom,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
        this.apparatus.reset();
        notebook.reset();
        this.frontPanel.update();
      },
    });
    this.children = [bench, this.frontPanel];
    const cable = (jack: Node, reference: boolean) => {
      const port = reference ? this.apparatus.syncPort : this.apparatus.signalPort;
      const start = this.globalToLocalPoint(port.localToGlobalBounds(port.localBounds).centerBottom);
      const jackBounds = jack.localToGlobalBounds(jack.localBounds);
      const end = this.globalToLocalPoint(jackBounds.leftCenter);
      const x = end.x + layout.CONNECTOR_RADIUS + layout.CABLE_WIDTH / 2;
      const y = end.y - layout.CONNECTOR_RADIUS;
      return new Path(
        new Shape()
          .moveTo(start.x, start.y)
          .cubicCurveTo(start.x, start.y + layout.CABLE_DROP, x, y - layout.CABLE_DROP, x, y),
        {
          stroke: reference ? Colors.referenceTraceColorProperty : Colors.inputTraceColorProperty,
          lineWidth: layout.CABLE_WIDTH,
          lineCap: "round",
          pickable: false,
        },
      );
    };
    this.addChild(cable(this.frontPanel.signalJack, false));
    this.addChild(cable(this.frontPanel.referenceJack, true));
    this.addChild(reset);
    this.addChild(popupLayer);
    this.addChild(new Node({ pdomOrder: [this.apparatus, this.frontPanel, notebook, reset] }));
  }

  public override step(dt: number): void {
    this.apparatus.update(dt);
    this.frontPanel.update();
  }
}
