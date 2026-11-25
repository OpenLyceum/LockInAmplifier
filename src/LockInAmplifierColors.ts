/**
 * LockInAmplifierColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import LockInAmplifierColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import LockInAmplifierColors from "../../LockInAmplifierColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: LockInAmplifierColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the LockInAmplifierColors object below.
 * Always provide both "default" and "projector" values.
 */
import { Color, ProfileColorProperty } from "scenerystack/scenery";
import LockInAmplifierNamespace from "./LockInAmplifierNamespace.js";

const LockInAmplifierColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),
  chartBackgroundColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "chartBackground", {
    default: "#101a2c",
    projector: "#ffffff",
  }),
  chartBorderColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "chartBorder", {
    default: "#394861",
    projector: "#7e8b99",
  }),
  gridColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "grid", {
    default: "#33425a",
    projector: "#d2dae4",
  }),
  axisColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "axis", {
    default: "#9aadc4",
    projector: "#405369",
  }),
  mutedTextColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "mutedText", {
    default: "#b2c2d8",
    projector: "#384b62",
  }),
  inputTraceColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "inputTrace", {
    default: "#65c4ff",
    projector: "#005e96",
  }),
  cleanTraceColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "cleanTrace", {
    default: "#f6bb62",
    projector: "#9d4b00",
  }),
  referenceTraceColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "referenceTrace", {
    default: "#e5a6ff",
    projector: "#6f289a",
  }),
  productTraceColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "productTrace", {
    default: "#f6bb62",
    projector: "#9d4b00",
  }),
  outputTraceColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "outputTrace", {
    default: "#7be3c4",
    projector: "#006756",
  }),
  quadratureTraceColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "quadratureTrace", {
    default: "#fba8cf",
    projector: "#92225d",
  }),
  guideColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "guide", {
    default: "#f5ecac",
    projector: "#795600",
  }),
  rangeBandColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "rangeBand", {
    default: "rgba(245, 191, 77, 0.16)",
    projector: "rgba(169, 111, 0, 0.15)",
  }),
  selectedBlockColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "selectedBlock", {
    default: "#273f5b",
    projector: "#deedf8",
  }),
  knobBodyColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "knobBody", {
    default: new Color(54, 68, 85),
    projector: new Color(222, 229, 236),
  }),
  knobRimColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "knobRim", {
    default: new Color(111, 130, 151),
    projector: new Color(90, 106, 124),
  }),
  knobIndicatorColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "knobIndicator", {
    default: new Color(241, 246, 252),
    projector: new Color(28, 45, 62),
  }),
  panelButtonColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "panelButton", {
    default: new Color(218, 229, 242),
    projector: new Color(227, 235, 244),
  }),
  ledOffColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "ledOff", {
    default: new Color(86, 98, 115),
    projector: new Color(174, 184, 195),
  }),
  labWarningColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "labWarning", {
    default: new Color(255, 186, 90),
    projector: new Color(147, 65, 0),
  }),
  labReadoutColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "labReadout", {
    default: new Color(152, 245, 225),
    projector: new Color(0, 86, 78),
  }),
  labFaceColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "labFace", {
    default: new Color(20, 30, 43),
    projector: new Color(229, 235, 241),
  }),
  badgeBackgroundColorProperty: new ProfileColorProperty(LockInAmplifierNamespace, "badgeBackground", {
    default: "#263851",
    projector: "#e5edf6",
  }),
};

export default LockInAmplifierColors;
