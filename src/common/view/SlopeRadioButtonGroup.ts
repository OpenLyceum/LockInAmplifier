/** Flat instrument choices for the four low-pass slopes. */
import { DerivedProperty, type NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { RectangularRadioButtonGroup } from "scenerystack/sun";
import Colors from "../../LockInAmplifierColors.js";
import { FILTER_SETTINGS, CONTROL_SETTINGS as metrics } from "../../LockInAmplifierConstants.js";
import { DisposalBag } from "./DisposalBag.js";
import { chartLabelFont, formatValue, instrumentStrings, instrumentText } from "./instrumentText.js";

export class SlopeRadioButtonGroup extends RectangularRadioButtonGroup<number> {
  private readonly bag: DisposalBag;

  public constructor(orderProperty: NumberProperty, accessibleName: TReadOnlyProperty<string>) {
    const bag = new DisposalBag();
    const patternProperty = instrumentStrings.units.slopeStringProperty;
    const items = Object.values(FILTER_SETTINGS.ORDERS).map((order) => {
      const labelProperty = new DerivedProperty([patternProperty], (pattern) =>
        formatValue(pattern, order * FILTER_SETTINGS.DB_PER_OCTAVE_PER_POLE, 0),
      );
      bag.own(labelProperty);
      return {
        value: order,
        createNode: () => {
          const label = instrumentText(labelProperty, {
            font: chartLabelFont,
            fill: Colors.controlSurfaceTextColorProperty,
          });
          bag.own(label);
          return label;
        },
        options: { accessibleName: labelProperty },
      };
    });
    super(orderProperty, items, {
      accessibleName,
      labelTagName: "h3",
      orientation: "horizontal",
      spacing: metrics.SLOPE_SPACING,
      radioButtonOptions: {
        xMargin: metrics.BUTTON_MARGIN,
        yMargin: metrics.FIELD_INSET,
        baseColor: Colors.controlSurfaceColorProperty,
        buttonAppearanceStrategyOptions: {
          selectedStroke: Colors.outputTraceColorProperty,
          deselectedStroke: Colors.chartBorderColorProperty,
          deselectedButtonOpacity: metrics.UNSELECTED_SLOPE_OPACITY,
        },
        contentAppearanceStrategyOptions: { deselectedContentOpacity: 1 },
      },
    });
    this.bag = bag;
  }

  public override dispose(): void {
    super.dispose();
    this.bag.dispose();
  }
}
