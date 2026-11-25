/** Hidden quantities alongside estimates derived from the current notebook. */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { AlignBox, GridBox, RichText, VBox } from "scenerystack/scenery";
import { formatValue, instrumentStrings, instrumentText } from "../../common/view/instrumentText.js";
import Colors from "../../LockInAmplifierColors.js";
import { LAB_SETTINGS, LAB_LAYOUT_SETTINGS as layout } from "../../LockInAmplifierConstants.js";
import type { LabRow, VirtualExperimentModel } from "../model/VirtualExperimentModel.js";
import { lab, labHeadingFont, labLabelFont, sampleLabels } from "./labText.js";

const units = instrumentStrings.units;
const correction = 2 / Math.PI;
const notes = {
  choppedLight: lab.lightRevealStringProperty,
  bridge: lab.bridgeRevealStringProperty,
  rcFilter: lab.rcRevealStringProperty,
};

function cutoffEstimate(rows: readonly LabRow[]): number {
  const points = rows
    .map((row) => ({
      f: row.frequency,
      angle: Math.atan2(Math.sin(row.theta + row.phase), Math.cos(row.theta + row.phase)),
    }))
    .sort((a, b) => a.f - b.f);
  const target = -Math.PI / 4;
  let best = NaN;
  let narrowest = Infinity;
  for (let index = 1; index < points.length; index++) {
    const first = points[index - 1];
    const second = points[index];
    if (!(first && second) || first.angle < target || second.angle >= target || first.f === second.f) {
      continue;
    }
    const span = Math.log(second.f / first.f);
    if (span < narrowest) {
      best = first.f * Math.exp((span * (target - first.angle)) / (second.angle - first.angle));
      narrowest = span;
    }
  }
  if (Number.isFinite(best)) {
    return best;
  }
  const closest = points
    .filter(({ angle }) => angle < 0 && angle > -Math.PI / 2)
    .sort((a, b) => Math.abs(a.angle - target) - Math.abs(b.angle - target))[0];
  return closest ? closest.f / Math.tan(-closest.angle) : NaN;
}

function comparison(model: VirtualExperimentModel): string[][] {
  const scenario = model.scenarioProperty.value;
  const truth = model.reveal();
  const valid = model.rowsProperty.value.filter((row) => !row.clipped && row.harmonic === 1);
  if (scenario === "choppedLight") {
    const measure = (sample: "none" | "A" | "B" | "C") =>
      valid.findLast((row) => row.scenario === scenario && row.sample === sample && row.r > 0)?.r ?? NaN;
    const open = measure("none");
    const asPercent = (value: number) => formatValue(lab.percentStringProperty.value, value * 100, 1);
    return [
      [
        lab.blankAmplitudeStringProperty.value,
        formatValue(units.voltsStringProperty.value, LAB_SETTINGS.LED_INTENSITY * LAB_SETTINGS.OPTICAL_GAIN, 3),
        formatValue(units.voltsStringProperty.value, open / correction, 3),
      ],
      ...(["A", "B", "C"] as const).map((sample) => [
        StringUtils.fillIn(lab.transmissionStringProperty.value, { sample: sampleLabels[sample].value }),
        asPercent(truth[sample] ?? NaN),
        asPercent(measure(sample) / open),
      ]),
    ];
  }
  if (scenario === "bridge") {
    const best = valid.filter((row) => row.scenario === scenario).sort((a, b) => a.r - b.r)[0];
    const strain = (value: number) => formatValue(lab.microstrainStringProperty.value, value * 1e6, 1);
    const capacitance = (value: number) => formatValue(lab.picofaradsStringProperty.value, value * 1e12, 1);
    return [
      [lab.strainStringProperty.value, strain(truth["strain"] ?? NaN), strain(best?.strainTrim ?? NaN)],
      [
        lab.capacitanceStringProperty.value,
        capacitance(truth["strayCapacitance"] ?? NaN),
        capacitance(best?.capacitanceTrim ?? NaN),
      ],
    ];
  }
  const hertz = (value: number) => formatValue(units.hertzStringProperty.value, value, 1);
  return [[lab.cutoffStringProperty.value, hertz(truth["cutoffFrequency"] ?? NaN), hertz(cutoffEstimate(valid))]];
}

export class LabRevealNode extends VBox {
  public constructor(model: VirtualExperimentModel, width: number, visible: TReadOnlyProperty<boolean>) {
    const dataProperty = DerivedProperty.deriveAny(
      [
        model.rowsProperty,
        model.scenarioProperty,
        visible,
        ...Object.values(lab),
        units.voltsStringProperty,
        units.hertzStringProperty,
        units.unavailableStringProperty,
      ],
      () => (visible.value ? comparison(model) : []),
    );
    const columnWidth = width / 3;
    const headings = [lab.parameterStringProperty, lab.truthStringProperty, lab.estimateStringProperty];
    const cell = (text: TReadOnlyProperty<string>, column: number, heading: boolean) =>
      new AlignBox(
        instrumentText(text, {
          font: heading ? labHeadingFont : labLabelFont,
          fill: column === 1 ? Colors.labReadoutColorProperty : Colors.textColorProperty,
          maxWidth: columnWidth - layout.INSET,
          tagName: "span",
          innerContent: text,
        }),
        { preferredWidth: columnWidth, preferredHeight: layout.TABLE_ROW_HEIGHT, xAlign: "left" },
      );
    const grid = new GridBox({
      rows: [
        headings.map((text, index) => cell(text, index, true)),
        ...Array.from({ length: 4 }, (_, row) =>
          headings.map((_heading, column) =>
            cell(new DerivedProperty([dataProperty], (values) => values[row]?.[column] ?? ""), column, false),
          ),
        ),
      ],
    });
    const noteProperty = DerivedProperty.deriveAny(
      [model.scenarioProperty, ...Object.values(notes)],
      () => notes[model.scenarioProperty.value].value,
    );
    const paragraph = new RichText(noteProperty, {
      font: labLabelFont,
      fill: Colors.mutedTextColorProperty,
      lineWrap: width,
      accessibleParagraph: noteProperty,
    });
    super({ visibleProperty: visible, align: "left", spacing: layout.SECTION_GAP, children: [grid, paragraph] });
  }
}
