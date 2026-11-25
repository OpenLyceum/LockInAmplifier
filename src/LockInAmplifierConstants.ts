/**
 * LockInAmplifierConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in LockInAmplifierColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 *
 */

import LockInAmplifierNamespace from "./LockInAmplifierNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
const SCREEN_VIEW_MARGIN = 20;

/**
 * Corner radius shared by control panels and dialogs.
 * @public
 */
export const PANEL_CORNER_RADIUS = 6;

// ── Physics / model defaults (SI units) ───────────────────────────────────────

export const SAMPLING_SETTINGS = {
  SAMPLE_RATE: 20480, // Hz
  MAX_STEP_SECONDS: 0.25, // s, excess frame time is dropped
  STRIP_RATE: 256, // Hz
} as const;

export const SOURCE_SETTINGS = {
  DEFAULT_FREQUENCY: 100, // Hz
  DEFAULT_AMPLITUDE: 1, // V peak
} as const;

export const NOISE_SETTINGS = {
  DEFAULT_SEED: 1,
  PINK_POLES: 10,
  PINK_MIN_CORNER: 0.5, // Hz
  PINK_MAX_CORNER: 5000, // Hz
  PINK_CORNERS: { OFF: 0, LOW: 10, MEDIUM: 100, HIGH: 1000 }, // Hz
  MAINS_FREQUENCIES: { EUROPE: 50, NORTH_AMERICA: 60 }, // Hz
  MAINS_THIRD_HARMONIC_RATIO: 0.3,
} as const;

export const FILTER_SETTINGS = {
  DB_PER_OCTAVE_PER_POLE: 6,
  ORDERS: { FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4 },
  DEFAULT_TIME_CONSTANT: 0.1, // s
  TIME_CONSTANTS: [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10], // s
  SETTLING_FRACTION: 0.99,
  BISECTION_ITERATIONS: 52,
} as const;

export const SPECTRUM_SETTINGS = {
  RECORD_LENGTHS: [2 ** 11, 2 ** 13, 2 ** 15], // samples
  AVERAGE_COUNTS: [1, 4, 16, 64], // records
  HANN_ENBW_BINS: 1.5, // bins
} as const;

export const STATISTICS_SETTINGS = {
  WINDOW_SECONDS: 10, // s
  HISTOGRAM_BINS: 40,
  HISTOGRAM_SIGMAS: 4,
} as const;

export const LAB_SETTINGS = {
  OPTICAL_GAIN: 1, // V per unit intensity
  BACKGROUND_INTENSITY: 1, // relative intensity
  LED_INTENSITY: 1, // relative intensity
  FLICKER_RATIO: 0.2,
  CHOP_FREQUENCY_RANGE: [5, 1000], // Hz
  INITIAL_CHOP_FREQUENCY: 100, // Hz
  INITIAL_TRANSMITTANCE: 0.4, // dimensionless
  TRANSMITTANCE_RANGE: [0.05, 0.9], // dimensionless
  BRIDGE_RESISTANCE: 1000, // Ω
  EXCITATION_AMPLITUDE: 1, // V peak
  INITIAL_STRAIN: 500e-6, // dimensionless strain
  STRAIN_RANGE: [100e-6, 1000e-6], // dimensionless strain
  GAUGE_FACTOR: 2,
  INITIAL_STRAY_CAPACITANCE: 25e-12, // F
  STRAY_CAPACITANCE_RANGE: [5e-12, 50e-12], // F
  RC_CUTOFF_RANGE: [80, 2000], // Hz
  INITIAL_RC_CUTOFF: 400, // Hz
  INPUT_NOISE_DENSITY: 0.001, // V/√Hz
  DRIFT_RATE: 0.001, // V/√s
} as const;

/** Signal and Noise instrument inputs. All voltages are peak unless marked RMS. */
export const SIGNAL_NOISE_SETTINGS = {
  AMPLITUDE_RANGE: [0, 1], // V
  AMPLITUDE: 0.05, // V
  FREQUENCY_RANGE: [10, 2000], // Hz
  FREQUENCY: 137, // Hz
  DENSITY_RANGE: [0, 0.02], // V/√Hz
  DENSITY: 0.005, // V/√Hz
  MAINS_RANGE: [0, 1], // V
  BANDWIDTH_RANGE: [0.1, 1000], // Hz
  BANDWIDTH: 10, // Hz
  RECORD_LENGTH: SPECTRUM_SETTINGS.RECORD_LENGTHS[1], // samples
  AVERAGES: SPECTRUM_SETTINGS.AVERAGE_COUNTS[1],
} as const;

/** Mixing inputs and output history. */
export const MIXING_SETTINGS = {
  AMPLITUDE: 0.5, // V
  AMPLITUDE_RANGE: [0, 1], // V
  FREQUENCY: SOURCE_SETTINGS.DEFAULT_FREQUENCY, // Hz
  REFERENCE_RANGE: [10, 2000], // Hz
  REFERENCE_STEP: 1, // Hz
  PHASE_RANGE: [-Math.PI, Math.PI], // rad
  PHASE_STEP: Math.PI / 180, // rad
  NOISE_DENSITY: 0.001, // V/√Hz when enabled
  TIME_CONSTANT: 0.03, // s
  ORDER: FILTER_SETTINGS.ORDERS.FIRST,
  DC_AVERAGE_SECONDS: 1, // s
  STRIP_WINDOW: 10, // s
} as const;

/** Chart domains, redraw budgets and internal margins (pixels). */
export const CHART_SETTINGS = {
  SCOPE_WINDOWS: [0.01, 0.02, 0.05, 0.1], // s
  STRIP_WINDOWS: [5, 10, 30], // s
  SCOPE_REDRAW_HZ: 30,
  SPECTRUM_REDRAW_HZ: 5,
  MINIMUM_VOLTAGE_SPAN: 0.001, // V
  SCALE_HEADROOM: 1.12,
  SCALE_SHRINK: 0.34,
  FREQUENCY_RANGE: [1, 10000], // Hz
  DECIBEL_RANGE: [-120, 10], // dB V before the first record
  SPECTRUM_FLOOR_MARGIN: 25, // dB
  SPECTRUM_PEAK_MARGIN: 10, // dB
  SPECTRUM_LEVEL_STEP: 10, // dB
  SPECTRUM_HYSTERESIS: 10, // dB
  SPECTRUM_FIRST_BIN: 2,
  SPARSE_BIN_GAP: 8, // px
  SPECTRUM_TICKS: [1, 10, 100, 1000, 10000], // Hz
  LEFT: 54,
  RIGHT: 18,
  TOP: 32,
  COMPACT_TOP: 24,
  BOTTOM: 38,
  COMPACT_BOTTOM: 8,
  DC_GUTTER: 33,
  GRID_WIDTH: 1,
  TRACE_WIDTH: 1.35,
  GUIDE_WIDTH: 1.5,
  DASH: [6, 4],
  TITLE_SIZE: 15,
  LABEL_SIZE: 12,
  MARKER_LABEL_SIZE: 11,
  AXIS_LABEL_GAP: 5,
  MIN_PEAK_LABEL_GAP: 47,
  PEAK_MARKER_RADIUS: 2.5,
  TIME_TICK_INTERVALS: 5,
} as const;

export const ICON_SETTINGS = {
  WIDTH: 120,
  HEIGHT: 82,
  STROKE: 3.5,
  WAVE_SAMPLES: 96,
} as const;

/** Layout of the two teaching screens in the shared 1024×618 coordinate space. */
export const P2_LAYOUT_SETTINGS = {
  MARGIN: 14,
  GAP: 10,
  CONTROL_WIDTH: 342,
  SIGNAL_SCOPE_HEIGHT: 254,
  SIGNAL_SPECTRUM_HEIGHT: 276,
  MIXING_STRIP_HEIGHT: 153,
  MIXING_TRACE_HEIGHT: 96,
  MIXING_LAST_TRACE_HEIGHT: 123,
  MIXING_IDENTITY_HEIGHT: 62,
  DIAGRAM_HEIGHT: 55,
  DIAGRAM_COLUMN_FRACTIONS: [0.13, 0.38, 0.62, 0.86],
  DIAGRAM_BLOCK_WIDTH: 132,
  DIAGRAM_BLOCK_HEIGHT: 34,
  DIAGRAM_ARROW_SIZE: 5,
  RESET_RADIUS: 19,
  PLAY_RADIUS: 15,
  SIGNAL_CONTROL_SPACING: 9,
  RMS_BADGE_WIDTH: 57,
  RBW_READOUT_WIDTH: 123,
  NOISE_FLOOR_READOUT_WIDTH: 165,
  IDENTITY_COLUMN_FRACTION: 0.45,
  MIXING_CONTROL_SPACING: 6,
  TRACE_SPACING: 4,
} as const;

/** Shared instrument control dimensions (pixels). */
export const CONTROL_SETTINGS = {
  FONT_SIZE: 14,
  HEADING_SIZE: 16,
  TRACK_WIDTH: 108,
  TRACK_HEIGHT: 4,
  THUMB_WIDTH: 12,
  THUMB_HEIGHT: 17,
  VALUE_WIDTH: 85,
  READOUT_WIDTH: 78,
  LABEL_WIDTH: 94,
  CONTENT_GAP: 8,
  CHECKBOX_SIZE: 15,
  FIELD_INSET: 5,
  BUTTON_MARGIN: 7,
  SLOPE_SPACING: 4,
  UNSELECTED_SLOPE_OPACITY: 0.86,
  ACCORDION_MARGIN: 8,
} as const;

LockInAmplifierNamespace.register("LockInAmplifierConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
});

export const FILTERING_SETTINGS = {
  AMPLITUDE: 0.05, // V
  AMPLITUDE_RANGE: [0, 0.2], // V
  DENSITY: SIGNAL_NOISE_SETTINGS.DENSITY, // V/√Hz
  TIME_CONSTANT: 0.03, // s
  ORDER: FILTER_SETTINGS.ORDERS.FIRST,
  MINIMUM_STATS_WINDOW: 5, // s
  STATS_TIME_CONSTANTS: 20,
  FAST_SPEED: 10,
  FAST_MAX_STEP_SECONDS: 5, // simulated s, including a 0.5 s animation frame at 10×
  RANGE_TICK: 0.025, // V
  DEFAULT_STRIP_WINDOW: 10, // s
  BODE_DECADES: [0.001, 0.01, 0.1, 1, 10, 100, 1000], // Hz
  BODE_LEVELS: [-60, -45, -30, -15, 0], // dB
  RESPONSE_POINTS: 180,
  POWER_INSET_WIDTH: 120, // px
  POWER_INSET_HEIGHT: 46, // px
  POWER_INSET_FOOTER_HEIGHT: 103, // px
  NOISE_DECADES: [0.0001, 0.001, 0.01, 0.1], // V
  TAU_DECADES_MS: [1, 10, 100, 1000, 10000], // ms
  GAUSSIAN_POINTS: 80,
  PREDICTION_SIGMAS: 3,
  MARKER_SIZE: 4, // px
  CONTROL_WIDTH: 340,
  HISTOGRAM_WIDTH: 202,
  TOP_HEIGHT: 253,
  BOTTOM_HEIGHT: 279,
  FOOTER_NOTE_WIDTH: 790, // px, leaves room for Reset All in longer locales
} as const;

export const PHASE_SETTINGS = {
  AMPLITUDE: 0.1, // V
  AMPLITUDE_RANGE: FILTERING_SETTINGS.AMPLITUDE_RANGE, // V
  SIGNAL_PHASE: Math.PI / 3, // rad
  PHASE_RANGE: MIXING_SETTINGS.PHASE_RANGE, // rad
  PHASE_STEP: MIXING_SETTINGS.PHASE_STEP, // rad
  COARSE_PHASE_STEP: Math.PI / 12, // rad
  DETUNE_RANGE: [-2, 2], // Hz, signal minus reference
  DETUNE_STEP: 0.05, // Hz
  TIME_CONSTANT: FILTERING_SETTINGS.TIME_CONSTANT, // s
  ORDER: FILTER_SETTINGS.ORDERS.SECOND,
  DENSITY: SIGNAL_NOISE_SETTINGS.DENSITY, // V/√Hz
  HIDDEN_PHASE_SEED: 427,
  TRAIL_SECONDS: 3, // s
  STRIP_SECONDS: 5, // s
  TRAIL_LAYERS: 5,
  TRAIL_POINTS_PER_SECOND: 64,
  TRAIL_DOT_RADIUS: 1.25, // px
  ANGLE_ARC_RADIUS: 24, // px
  ARROW_HEAD: 10, // px
  FRAME_HEIGHT: 72,
  FRAME_RADIUS: 33,
  PLANE_HEIGHT: 374,
  STRIP_HEIGHT: 172,
  CONTROL_WIDTH: 364,
  READOUT_WIDTH: 154,
  READOUT_BADGE_WIDTH: 88,
  KNOB_RADIUS: 27,
  KNOB_SWEEP: (3 * Math.PI) / 2, // rad
  KNOB_DRAG_DEAD_ZONE: 6,
  KNOB_TICK_START: 2,
  KNOB_TICK_END: 6,
  KNOB_POINTER_INSET: 5,
  KNOB_MOUSE_INSET: 7,
  KNOB_TOUCH_INSET: 10,
} as const;

export const P3_LAYOUT_SETTINGS = {
  MARGIN: P2_LAYOUT_SETTINGS.MARGIN,
  GAP: 10,
  CONTENT_GAP: 9,
  ROW_GAP: 7,
  SECTION_GAP: 13,
  PLAY_RADIUS: P2_LAYOUT_SETTINGS.PLAY_RADIUS,
  RESET_RADIUS: P2_LAYOUT_SETTINGS.RESET_RADIUS,
  PANEL_INSET: 12,
  CONTROL_DELTA: 0.005, // V
} as const;

export const LAB_INSTRUMENT_SETTINGS = {
  SENSITIVITIES: [
    1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2, 0.5, 1,
  ], // V full scale
  INPUT_RANGES: [0.01, 0.1, 1, 10], // V peak
  REFERENCE_RANGE: [1, 5000], // Hz
  REFERENCE_KNOB_STEPS: { keyboardStep: 0.05, shiftKeyboardStep: 0.002, pageKeyboardStep: 0.25 }, // log10(Hz)
  PHASE_KNOB_STEPS: { keyboardStep: Math.PI / 180, shiftKeyboardStep: Math.PI / 1800, pageKeyboardStep: Math.PI / 12 }, // rad
  CHOPPER_KNOB_STEPS: { keyboardStep: 1, shiftKeyboardStep: 0.1, pageKeyboardStep: 20 }, // Hz
  STRAIN_KNOB_STEPS: { keyboardStep: 1e-5, shiftKeyboardStep: 1e-6, pageKeyboardStep: 1e-4 }, // dimensionless strain
  CAPACITANCE_KNOB_STEPS: { keyboardStep: 1e-12, shiftKeyboardStep: 1e-13, pageKeyboardStep: 10e-12 }, // F
  DISPLAY_FULL_SCALE_COUNTS: 10000,
  DISPLAY_MAX_COUNTS: 19999,
  RESPONSE_MAGNITUDE_LIMIT: 1.04, // V
  LOCK_HOLD: 0.5, // s
  OVERLOAD_HOLD: 0.12, // s
  MAX_ROWS: 50,
  HIGH_NOISE_DENSITY: 0.02, // V/√Hz
  TRIM_STRAIN_RANGE: [-0.001, 0.0012], // dimensionless
  TRIM_CAPACITANCE_RANGE: [0, 60e-12], // F
  SCOPE_WINDOW: 0.04, // s
  DEFAULTS: {
    choppedLight: {
      sensitivity: 1,
      range: 10,
      frequency: LAB_SETTINGS.INITIAL_CHOP_FREQUENCY,
      density: LAB_SETTINGS.INPUT_NOISE_DENSITY,
    },
    bridge: { sensitivity: 0.001, range: 0.01, frequency: 2500, density: 0.00000002 },
    rcFilter: { sensitivity: 1, range: 10, frequency: 100, density: LAB_SETTINGS.INPUT_NOISE_DENSITY },
  },
} as const;

export const ROTARY_SETTINGS = {
  RADIUS: 21,
  SWEEP: PHASE_SETTINGS.KNOB_SWEEP,
  DEAD_ZONE: PHASE_SETTINGS.KNOB_DRAG_DEAD_ZONE,
  TICK_START: PHASE_SETTINGS.KNOB_TICK_START,
  TICK_END: PHASE_SETTINGS.KNOB_TICK_END,
  POINTER_INSET: PHASE_SETTINGS.KNOB_POINTER_INSET,
  MOUSE_INSET: 6,
  TOUCH_INSET: 9,
  RIM_WIDTH: 2,
  TICK_WIDTH: 1.25,
  POINTER_WIDTH: 3,
  LABEL_SIZE: 11,
  VALUE_SIZE: 12,
  LABEL_GAP: 3,
  INNER_DISC_RATIO: 0.68,
  INNER_DISC_OPACITY: 0.3,
  MAX_DETENT_STEP: Math.PI / 6,
  KEY_STEP: 1 / 20,
  FINE_KEY_STEP: 1 / 100,
  PAGE_KEY_STEP: 1 / 5,
} as const;

export const LAB_LAYOUT_SETTINGS = {
  MARGIN: 16,
  GAP: 12,
  INSET: 11,
  COMPACT_GAP: 6,
  SECTION_GAP: 9,
  TOP_HEIGHT: 316,
  APPARATUS_WIDTH: 460,
  APPARATUS_SCENARIO_LABEL_WIDTH: 212,
  APPARATUS_DRAWING_HEIGHT: 116,
  WORKSPACE_HEIGHT: 218,
  SCOPE_HEIGHT: 153,
  FRONT_SECTION_WIDTHS: [158, 288, 151, 304],
  KNOB_GAP: 10,
  INDICATOR_RADIUS: 4,
  DISPLAY_WIDTH: 144,
  DISPLAY_HEIGHT: 33,
  METER_WIDTH: 126,
  METER_HEIGHT: 11,
  DISPLAY_FONT_SIZE: 19,
  LABEL_SIZE: 12,
  HEADING_SIZE: 14,
  KEY_FONT_SIZE: 11,
  KEY_INSET_X: 7,
  KEY_INSET_Y: 4,
  KEY_RADIUS: 3,
  TABLE_VISIBLE_ROWS: 5,
  TABLE_CELL_WIDTH: 53,
  TABLE_SETTING_WIDTH: 99,
  TABLE_ROW_HEIGHT: 22,
  RESPONSE_HEIGHT: 202,
  RESET_RADIUS: 17,
  CABLE_WIDTH: 3,
  CONNECTOR_RADIUS: 6,
  DISPLAY_KNOB_RADIUS: 17,
  APPARATUS_SIGNAL_PORT_INSET: 80,
  APPARATUS_SYNC_PORT_INSET: 37,
  CABLE_DROP: 24,
} as const;

/** Points are in the local coordinates of the experiment drawing. */
export const LAB_DRAWING_SETTINGS = {
  BEAM_X: [38, 129, 225, 313, 416],
  BEAM_Y: 46,
  LABEL_Y: 92,
  RADIUS: 29,
  BLADE_RADIUS: 26,
  APERTURE_RADIUS: 7,
  SIGNAL_WIDTH: 2,
  GRID: 12,
  BRIDGE_ORIGIN_X: 96,
  BRIDGE_ORIGIN_Y: 46,
  BRIDGE_ARM: 38,
  BRIDGE_PICKUP_X: 175,
  CANTILEVER_X: 257,
  CANTILEVER_Y: 42,
  CANTILEVER_LENGTH: 130,
  STRAIN_VISUAL_GAIN: 24000, // px per dimensionless strain
  BOX_X: 141,
  BOX_Y: 12,
  BOX_WIDTH: 176,
  BOX_HEIGHT: 72,
  SLIDER_WIDTH: 146,
  SLIDER_HEIGHT: 5,
} as const;
