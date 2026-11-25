// Copied from OpenLyceum/ACPhasor@880c49a; adapted: compact instrument layout, unit scaling and discrete mapping.
/** Themed NumberControl whose slider can use a different coordinate system from the model. */
import { NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, Range } from "scenerystack/dot";
import { combineOptions, optionize } from "scenerystack/phet-core";
import { AlignBox, HBox } from "scenerystack/scenery";
import { NumberControl, type NumberControlOptions } from "scenerystack/scenery-phet";
import Colors from "../../LockInAmplifierColors.js";
import { CONTROL_SETTINGS as metrics } from "../../LockInAmplifierConstants.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../LockInAmplifierButtonOptions.js";
import { DisposalBag } from "./DisposalBag.js";
import { formatValue, instrumentFont } from "./instrumentText.js";

type Mapping = {
  range: Range;
  inverse: (position: number) => number;
  forward: (value: number) => number;
};

type SelfOptions = {
  logarithmic?: boolean;
  mapping?: Mapping | null;
  decimals?: number;
  multiplier?: number;
  valueFormatter?: ((value: number) => string) | null;
  extraFormattingDependencies?: readonly TReadOnlyProperty<string>[];
};

type ControlOptions = SelfOptions & NumberControlOptions;

export class LockInAmplifierNumberControl extends NumberControl {
  private readonly bag: DisposalBag;

  public constructor(
    titleProperty: TReadOnlyProperty<string>,
    numberProperty: NumberProperty,
    range: Range,
    patternProperty: TReadOnlyProperty<string>,
    providedOptions?: ControlOptions,
  ) {
    const {
      logarithmic,
      mapping,
      decimals,
      multiplier,
      valueFormatter,
      extraFormattingDependencies,
      ...controlOptions
    } = optionize<ControlOptions, SelfOptions, NumberControlOptions>()(
      {
        logarithmic: false,
        mapping: null,
        valueFormatter: null,
        decimals: 1,
        multiplier: 1,
        extraFormattingDependencies: [],
      },
      providedOptions,
    );
    const map =
      mapping ??
      (logarithmic
        ? {
            range: new Range(Math.log10(range.min), Math.log10(range.max)),
            forward: Math.log10,
            inverse: (value: number) => 10 ** value,
          }
        : null);
    const sliderRange = map?.range ?? range;
    const delta = controlOptions.delta ?? sliderRange.getLength() / 100;
    const bag = new DisposalBag();

    let sliderProperty = numberProperty;
    if (map) {
      const positionProperty = new NumberProperty(map.forward(numberProperty.value), { range: sliderRange });
      sliderProperty = positionProperty;
      bag.own(positionProperty);
      let syncing = false;
      bag.lazyLink(numberProperty, (value) => {
        if (!syncing) {
          syncing = true;
          positionProperty.value = sliderRange.constrainValue(map.forward(value));
          syncing = false;
        }
      });
      bag.lazyLink(positionProperty, (position) => {
        if (!syncing) {
          syncing = true;
          numberProperty.value = range.constrainValue(map.inverse(position));
          syncing = false;
        }
      });
    }

    const format = (position: number): string => {
      const value = map ? map.inverse(position) : position;
      return valueFormatter?.(value) ?? formatValue(patternProperty.value, value * multiplier, decimals, true);
    };
    super(
      titleProperty,
      sliderProperty,
      sliderRange,
      combineOptions<NumberControlOptions>(
        {
          accessibleName: titleProperty,
          delta,
          includeArrowButtons: false,
          titleNodeOptions: { font: instrumentFont, fill: Colors.textColorProperty, maxWidth: metrics.LABEL_WIDTH },
          numberDisplayOptions: {
            numberFormatter: format,
            numberFormatterDependencies: [patternProperty, ...extraFormattingDependencies],
            backgroundFill: Colors.badgeBackgroundColorProperty,
            backgroundStroke: null,
            textOptions: { font: instrumentFont, fill: Colors.textColorProperty, maxWidth: metrics.VALUE_WIDTH },
            xMargin: metrics.FIELD_INSET,
          },
          arrowButtonOptions: {
            ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
            baseColor: Colors.controlSurfaceColorProperty,
            touchAreaXDilation: 0,
            touchAreaYDilation: 0,
          },
          sliderOptions: {
            trackSize: new Dimension2(
              controlOptions.includeArrowButtons ? metrics.TRACK_WIDTH / 2 : metrics.TRACK_WIDTH,
              metrics.TRACK_HEIGHT,
            ),
            thumbSize: new Dimension2(metrics.THUMB_WIDTH, metrics.THUMB_HEIGHT),
            trackFillEnabled: Colors.axisColorProperty,
            thumbFill: Colors.accentColorProperty,
            thumbStroke: Colors.chartBorderColorProperty,
            thumbCenterLineStroke: Colors.chartBackgroundColorProperty,
            pdomCreateAriaValueText: format,
            pdomDependencies: [patternProperty, ...extraFormattingDependencies],
            keyboardStep: delta,
            shiftKeyboardStep: delta,
          },
          layoutFunction: (title, display, slider, decrement, increment) => {
            const sliderRow = new HBox({
              spacing: metrics.SLOPE_SPACING,
              children: decrement && increment ? [decrement, slider, increment] : [slider],
            });
            const label = new AlignBox(title, { preferredWidth: metrics.LABEL_WIDTH, xAlign: "left" });
            const reading = new AlignBox(display, { preferredWidth: metrics.VALUE_WIDTH, xAlign: "right" });
            const row = new HBox({ spacing: metrics.CONTENT_GAP, children: [label, sliderRow, reading] });
            bag.own(row, reading, label, sliderRow);
            return row;
          },
        },
        controlOptions,
      ),
    );
    this.bag = bag;
  }

  public override dispose(): void {
    super.dispose();
    this.bag.dispose();
  }
}
