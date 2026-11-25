/** Paginated scenario-aware notebook and CSV export. */
import { DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { AlignBox, GridBox, HBox, Node, RichText, VBox } from "scenerystack/scenery";
import { PanelButton } from "../../common/controls/PanelButton.js";
import { downloadTextFile } from "../../common/downloadFile.js";
import { formatValue, instrumentStrings, instrumentText } from "../../common/view/instrumentText.js";
import Colors from "../../LockInAmplifierColors.js";
import { LAB_LAYOUT_SETTINGS as layout } from "../../LockInAmplifierConstants.js";
import type { LabRow, VirtualExperimentModel } from "../model/VirtualExperimentModel.js";
import { lab, labA11y, labHeadingFont, labLabelFont, sampleLabels } from "./labText.js";

const names = labA11y.controls;
const degreesPerRadian = 180 / Math.PI;
const headers = [
  lab.headerFrequencyStringProperty,
  lab.headerPhaseStringProperty,
  lab.headerHarmonicStringProperty,
  lab.headerXStringProperty,
  lab.headerYStringProperty,
  lab.headerRStringProperty,
  lab.headerThetaStringProperty,
];

type Scenario = VirtualExperimentModel["scenarioProperty"]["value"];

function settingHeaders(scenario: Scenario): TReadOnlyProperty<string>[] {
  switch (scenario) {
    case "choppedLight":
      return [lab.sampleStringProperty];
    case "bridge":
      return [lab.headerTrimRStringProperty, lab.headerTrimCStringProperty];
    case "rcFilter":
      return [];
  }
}

function settingsFor(row: LabRow): (string | number)[] {
  switch (row.scenario) {
    case "choppedLight":
      return [sampleLabels[row.sample].value];
    case "bridge":
      return [row.strainTrim * 1e6, row.capacitanceTrim * 1e12];
    case "rcFilter":
      return [];
  }
}

function exportCsv(model: VirtualExperimentModel): void {
  const heading = [...headers, ...settingHeaders(model.scenarioProperty.value), lab.csvClippedStringProperty];
  const cells = (values: readonly (string | number)[]) =>
    values.map((value) => (typeof value === "number" ? String(value) : `"${value.replaceAll('"', '""')}"`)).join(",");
  const lines = [
    cells(heading.map((label) => label.value)),
    ...model.rowsProperty.value.map((row) =>
      cells([
        row.frequency,
        row.phase * degreesPerRadian,
        row.harmonic,
        row.x,
        row.y,
        row.r,
        row.theta * degreesPerRadian,
        ...settingsFor(row),
        Number(row.clipped),
      ]),
    ),
  ];
  downloadTextFile(lab.csvFilenameStringProperty.value, lines.join("\r\n"));
}

const perPage = layout.TABLE_VISIBLE_ROWS;
const dash = instrumentStrings.units.unavailableStringProperty;
const number = instrumentStrings.units.numberStringProperty;
function formatRow(row: LabRow): string[] {
  const rawFrequency = formatValue(number.value, row.frequency, 1, true);
  const frequency = row.clipped
    ? StringUtils.fillIn(lab.clipMarkerStringProperty.value, { value: rawFrequency })
    : rawFrequency;
  return [
    frequency,
    formatValue(number.value, row.phase * degreesPerRadian, 1, true),
    String(row.harmonic),
    ...[row.x, row.y, row.r].map((value) => value.toPrecision(3)),
    formatValue(number.value, row.theta * degreesPerRadian, 1, true),
    ...settingsFor(row).map((value) => (typeof value === "number" ? formatValue(number.value, value, 1, true) : value)),
  ];
}

export class DataTableNode extends VBox {
  public constructor(model: VirtualExperimentModel, width: number) {
    const rows = model.rowsProperty;
    const pageProperty = new NumberProperty(0);
    const hasRowsProperty = new DerivedProperty([rows], (entries) => entries.length > 0);
    const footerLabelProperty = new DerivedProperty(
      [pageProperty, rows, lab.rowPageStringProperty],
      (page, entries, pattern) =>
        entries.length > 0
          ? StringUtils.fillIn(pattern, {
              first: page * perPage + 1,
              last: Math.min((page + 1) * perPage, entries.length),
            })
          : dash.value,
    );
    const prev = new PanelButton({
      labelStringProperty: lab.previousStringProperty,
      accessibleName: names.previousStringProperty,
      enabledProperty: new DerivedProperty([pageProperty], (page) => page > 0),
      listener: () => {
        pageProperty.value--;
      },
    });
    const next = new PanelButton({
      labelStringProperty: lab.nextStringProperty,
      accessibleName: names.nextStringProperty,
      enabledProperty: new DerivedProperty(
        [pageProperty, rows],
        (page, entries) => (page + 1) * perPage < entries.length,
      ),
      listener: () => {
        pageProperty.value++;
      },
    });
    const exportButton = new PanelButton({
      labelStringProperty: lab.exportStringProperty,
      accessibleName: names.exportStringProperty,
      enabledProperty: hasRowsProperty,
      listener: () => exportCsv(model),
    });

    const numericWidth = layout.TABLE_CELL_WIDTH;
    const harmonicWidth = numericWidth / 2;
    const settingWidth = layout.TABLE_SETTING_WIDTH;
    const lastWidth = numericWidth / 2;
    const cellWidths = [
      numericWidth,
      harmonicWidth + layout.INSET,
      harmonicWidth,
      numericWidth,
      numericWidth,
      numericWidth,
      numericWidth,
      settingWidth / 2,
      settingWidth / 2,
      lastWidth,
    ];
    const settingTitles = [0, 1].map((index) =>
      DerivedProperty.deriveAny(
        [
          model.scenarioProperty,
          lab.sampleStringProperty,
          lab.headerTrimRStringProperty,
          lab.headerTrimCStringProperty,
        ],
        () => settingHeaders(model.scenarioProperty.value)[index]?.value ?? "",
      ),
    );
    const emptyHeaderProperty = new DerivedProperty([dash], () => "");
    const heading = [...headers, ...settingTitles, emptyHeaderProperty].map(
      (title, column) =>
        new AlignBox(
          instrumentText(title, {
            font: labHeadingFont,
            fill: Colors.mutedTextColorProperty,
            maxWidth: (cellWidths[column] ?? numericWidth) - 2,
            tagName: "span",
            innerContent: title,
          }),
          { preferredWidth: cellWidths[column] ?? numericWidth, preferredHeight: layout.TABLE_ROW_HEIGHT },
        ),
    );
    const body = Array.from({ length: perPage }, (_, slot) => {
      const indexProperty = new DerivedProperty([pageProperty], (page) => page * perPage + slot);
      const currentRowProperty = new DerivedProperty([rows, indexProperty], (entries, index) => entries[index]);
      const visibleRowProperty = new DerivedProperty([currentRowProperty], (row) => row !== undefined);
      const rowNameProperty = new DerivedProperty([names.deleteStringProperty, indexProperty], (pattern, index) =>
        StringUtils.fillIn(pattern, { row: index + 1 }),
      );
      const button = new PanelButton({
        labelStringProperty: lab.removeStringProperty,
        accessibleName: rowNameProperty,
        enabledProperty: visibleRowProperty,
        visibleProperty: visibleRowProperty,
        listener: () => model.deleteRow(indexProperty.value),
      });
      const formattedProperty = DerivedProperty.deriveAny(
        [currentRowProperty, number, lab.clipMarkerStringProperty, ...Object.values(sampleLabels)],
        () => {
          const row = currentRowProperty.value;
          if (!row) {
            return [];
          }
          return formatRow(row);
        },
      );
      const cells = cellWidths.slice(0, -1).map((cellWidth, column) => {
        const textProperty = new DerivedProperty([formattedProperty], (values) => values[column] ?? "");
        return new AlignBox(
          instrumentText(textProperty, {
            font: labLabelFont,
            maxWidth: cellWidth - 2,
            tagName: "span",
            innerContent: textProperty,
          }),
          { preferredWidth: cellWidth, preferredHeight: layout.TABLE_ROW_HEIGHT },
        );
      });
      return [...cells, new AlignBox(button, { preferredWidth: lastWidth, preferredHeight: layout.TABLE_ROW_HEIGHT })];
    });
    const grid = new GridBox({ rows: [heading, ...body] });
    const emptyProperty = new DerivedProperty([hasRowsProperty, lab.noRowsStringProperty], (has, message) =>
      has ? "" : message,
    );
    const clipProperty = new DerivedProperty([rows, lab.clipLegendStringProperty], (entries, message) =>
      entries.some((row) => row.clipped) ? message : "",
    );
    const footer = new HBox({
      spacing: layout.COMPACT_GAP,
      children: [
        prev,
        instrumentText(footerLabelProperty, { font: labLabelFont }),
        next,
        exportButton,
        instrumentText(clipProperty, { font: labLabelFont, fill: Colors.labWarningColorProperty }),
      ],
    });
    const placeholder = new RichText(emptyProperty, {
      font: labLabelFont,
      fill: Colors.mutedTextColorProperty,
      lineWrap: width,
      tagName: "p",
      innerContent: emptyProperty,
    });
    const tableBody = new Node({ children: [grid, placeholder] });
    placeholder.centerX = grid.centerX;
    placeholder.centerY = grid.centerY;
    super({ spacing: layout.COMPACT_GAP, align: "left", children: [tableBody, footer] });
    this.pdomOrder = [tableBody, prev, next, exportButton];
    rows.lazyLink((entries, previous) => {
      const last = Math.max(0, Math.ceil(entries.length / perPage) - 1);
      pageProperty.value = entries.length > previous.length ? last : Math.min(last, pageProperty.value);
    });
  }
}
