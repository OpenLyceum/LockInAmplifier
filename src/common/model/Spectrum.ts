// Copied from OpenLyceum/Oscilloscope@189ba3a; adapted: absolute Hann scaling, reusable window and power averaging.
/** Periodic-Hann, single-sided spectra for fixed-length lock-in sample records. */
import { SAMPLING_SETTINGS, SPECTRUM_SETTINGS } from "../../LockInAmplifierConstants.js";

/** Allocates the working arrays once for a supported power-of-two record length. */
export function createSpectrumScratch(size: number) {
  if (!SPECTRUM_SETTINGS.RECORD_LENGTHS.some((length) => length === size)) {
    throw new RangeError("Unsupported spectrum record length");
  }

  const window = new Float64Array(size);
  let windowSum = 0;
  for (let i = 0; i < size; i++) {
    // The DFT treats the record as periodic, including the window.
    const weight = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
    window[i] = weight;
    windowSum += weight;
  }
  return {
    re: new Float64Array(size),
    im: new Float64Array(size),
    window,
    magnitudes: new Float64Array(size / 2 + 1),
    power: new Float64Array(size / 2 + 1),
    scale: 2 / windowSum,
    rbw: (SAMPLING_SETTINGS.SAMPLE_RATE * SPECTRUM_SETTINGS.HANN_ENBW_BINS) / size,
  };
}

type SpectrumScratch = ReturnType<typeof createSpectrumScratch>;

/**
 * Apply 2 |X[k]| / Σw to every bin. Interior bins give peak sinusoid amplitudes in volts.
 * The returned buffer is reused on each call.
 */
export function computeMagnitudeSpectrum(samples: Float64Array, scratch: SpectrumScratch): Float64Array {
  transform(samples, scratch);
  const { re, im, magnitudes, scale } = scratch;
  for (let k = 0; k < magnitudes.length; k++) {
    magnitudes[k] = Math.hypot(re[k] as number, im[k] as number) * scale;
  }
  return magnitudes;
}

/** Average squared peak amplitudes (V²) across records. The returned buffer is reused on each call. */
export function averagedPowerSpectrum(frames: readonly Float64Array[], scratch: SpectrumScratch): Float64Array {
  if (!SPECTRUM_SETTINGS.AVERAGE_COUNTS.some((count) => count === frames.length)) {
    throw new RangeError("Unsupported spectrum average count");
  }

  const { re, im, power, scale } = scratch;
  const scaleSquared = (scale * scale) / frames.length;
  power.fill(0);
  for (const frame of frames) {
    transform(frame, scratch);
    for (let k = 0; k < power.length; k++) {
      const real = re[k] as number;
      const imaginary = im[k] as number;
      power[k] = (power[k] as number) + (real * real + imaginary * imaginary) * scaleSquared;
    }
  }
  return power;
}

function transform(samples: Float64Array, scratch: SpectrumScratch): void {
  const { re, im, window } = scratch;
  if (samples.length !== re.length) {
    throw new RangeError("Spectrum record and scratch must have the same length");
  }
  im.fill(0);
  for (let i = 0; i < re.length; i++) {
    re[i] = (samples[i] as number) * (window[i] as number);
  }
  fftInPlace(re, im);
}

/** In-place iterative Cooley-Tukey radix-2 FFT. `re`/`im` length must be a power of two. */
function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length;

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tr = re[i] ?? 0;
      re[i] = re[j] ?? 0;
      re[j] = tr;
      const ti = im[i] ?? 0;
      im[i] = im[j] ?? 0;
      im[j] = ti;
    }
  }

  // Butterflies.
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curR = 1;
      let curI = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const reB = re[b] ?? 0;
        const imB = im[b] ?? 0;
        const tr = curR * reB - curI * imB;
        const ti = curR * imB + curI * reB;
        re[b] = (re[a] ?? 0) - tr;
        im[b] = (im[a] ?? 0) - ti;
        re[a] = (re[a] ?? 0) + tr;
        im[a] = (im[a] ?? 0) + ti;
        const nextR = curR * wr - curI * wi;
        curI = curR * wi + curI * wr;
        curR = nextR;
      }
    }
  }
}
