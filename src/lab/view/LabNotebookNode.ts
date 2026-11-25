/** Fixed-height notebook that alternates between the table, recorded RC plots and Reveal. */
import { BooleanProperty, DerivedProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { AlignBox, HBox, Node, VBox } from "scenerystack/scenery";
import { PanelButton } from "../../common/controls/PanelButton.js";
import { LockInAmplifierPanel } from "../../common/LockInAmplifierPanel.js";
import { instrumentText } from "../../common/view/instrumentText.js";
import Colors from "../../LockInAmplifierColors.js";
import { LAB_LAYOUT_SETTINGS as layout, LAB_INSTRUMENT_SETTINGS as settings } from "../../LockInAmplifierConstants.js";
import type { VirtualExperimentModel } from "../model/VirtualExperimentModel.js";
import { DataTableNode } from "./DataTableNode.js";
import { LabResponsePlots } from "./LabResponsePlots.js";
import { LabRevealNode } from "./LabRevealNode.js";
import { lab, labA11y, labHeadingFont, labLabelFont } from "./labText.js";

const names = labA11y.controls;

export class LabNotebookNode extends Node {
  private readonly showRevealProperty = new BooleanProperty(false);
  private readonly showResponseProperty = new BooleanProperty(false);

  public constructor(model: VirtualExperimentModel, width: number) {
    super();
    const isRcProperty = new DerivedProperty([model.scenarioProperty], (scenario) => scenario === "rcFilter");
    const countProperty = new DerivedProperty([model.rowsProperty, lab.rowCountStringProperty], (rows, pattern) =>
      StringUtils.fillIn(pattern, { count: rows.length, max: settings.MAX_ROWS }),
    );
    const showTableProperty = new DerivedProperty(
      [this.showRevealProperty, this.showResponseProperty],
      (reveal, response) => !(reveal || response),
    );
    const showPlotsProperty = new DerivedProperty(
      [isRcProperty, this.showRevealProperty, this.showResponseProperty],
      (rc, reveal, response) => rc && !reveal && response,
    );
    const newSample = new PanelButton({
      labelStringProperty: lab.newSampleStringProperty,
      accessibleName: names.newSampleStringProperty,
      listener: () => {
        this.showRevealProperty.value = false;
        model.randomizeScenario();
      },
    });
    const revealLabelProperty = new DerivedProperty(
      [this.showRevealProperty, lab.revealStringProperty, lab.hideStringProperty],
      (visible, show, hide) => (visible ? hide : show),
    );
    const revealNameProperty = new DerivedProperty(
      [this.showRevealProperty, names.revealStringProperty, names.hideStringProperty],
      (visible, show, hide) => (visible ? hide : show),
    );
    const revealButton = new PanelButton({
      labelStringProperty: revealLabelProperty,
      accessibleName: revealNameProperty,
      indicatorProperty: this.showRevealProperty,
      listener: () => {
        this.showRevealProperty.value = !this.showRevealProperty.value;
        if (this.showRevealProperty.value) {
          revealButton.addAccessibleResponse(labA11y.sampleRevealedStringProperty);
        }
      },
    });
    const responseLabelProperty = new DerivedProperty(
      [this.showResponseProperty, lab.responseStringProperty, lab.tableStringProperty],
      (visible, response, tableLabel) => (visible ? tableLabel : response),
    );
    const responseNameProperty = new DerivedProperty(
      [this.showResponseProperty, names.responseStringProperty, names.tableStringProperty],
      (visible, response, tableLabel) => (visible ? tableLabel : response),
    );
    const responseButton = new PanelButton({
      labelStringProperty: responseLabelProperty,
      accessibleName: responseNameProperty,
      visibleProperty: isRcProperty,
      listener: () => {
        this.showResponseProperty.value = !this.showResponseProperty.value;
        this.showRevealProperty.value = false;
      },
    });
    const table = new DataTableNode(model, width);
    const plots = new LabResponsePlots(model.rowsProperty, width);
    const comparison = new LabRevealNode(model, width, this.showRevealProperty);
    const workspace = new AlignBox(
      new Node({
        children: [
          new Node({ visibleProperty: showTableProperty, children: [table] }),
          new Node({ visibleProperty: showPlotsProperty, children: [plots] }),
          comparison,
        ],
      }),
      { preferredWidth: width, preferredHeight: layout.WORKSPACE_HEIGHT, xAlign: "left", yAlign: "top" },
    );
    const heading = new HBox({
      spacing: layout.SECTION_GAP,
      children: [
        instrumentText(lab.notebookStringProperty, { font: labHeadingFont }),
        instrumentText(countProperty, { font: labLabelFont, fill: Colors.mutedTextColorProperty }),
      ],
    });
    const actions = new HBox({ spacing: layout.COMPACT_GAP, children: [newSample, revealButton, responseButton] });
    this.children = [
      new LockInAmplifierPanel(
        new VBox({
          align: "left",
          spacing: layout.SECTION_GAP,
          children: [heading, actions, workspace],
        }),
        { xMargin: layout.INSET, yMargin: layout.INSET },
      ),
    ];
    this.pdomOrder = [newSample, revealButton, responseButton, workspace];
    model.scenarioProperty.lazyLink(() => this.reset());
  }

  public reset(): void {
    this.showRevealProperty.reset();
    this.showResponseProperty.reset();
  }
}
