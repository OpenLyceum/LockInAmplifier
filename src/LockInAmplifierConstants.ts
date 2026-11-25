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
export const SCREEN_VIEW_MARGIN = 20;

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

LockInAmplifierNamespace.register("LockInAmplifierConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
});
