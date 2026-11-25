/** FFT scratch for one Mixing spectrum, tracking DC separately from the log-frequency bins. */
import type { RingBuffer } from "../../common/model/RingBuffer.js";
import { computeMagnitudeSpectrum, createSpectrumScratch } from "../../common/model/Spectrum.js";
import { MIXING_SETTINGS, SAMPLING_SETTINGS, SPECTRUM_SETTINGS } from "../../LockInAmplifierConstants.js";

const size = SPECTRUM_SETTINGS.RECORD_LENGTHS[2];
const dcSamples = MIXING_SETTINGS.DC_AVERAGE_SECONDS * SAMPLING_SETTINGS.SAMPLE_RATE;

export class ProbeSpectrum {
  private readonly record = new Float64Array(size);
  private readonly scratch = createSpectrumScratch(size);
  public dc = 0;

  /** Process one complete record and return the reused magnitude buffer. */
  public compute(history: RingBuffer): Float64Array | null {
    if (history.length < size) {
      this.dc = 0;
      return null;
    }
    history.copyLatest(size, this.record);
    // The 1.6 s FFT can end partway through a beat. Measure DC over the same
    // one-second window as the scope mean so a 1 Hz beat does not appear as DC.
    let sum = 0;
    for (let index = size - dcSamples; index < size; index++) {
      sum += this.record[index] as number;
    }
    const mean = sum / dcSamples;
    this.dc = Math.abs(mean);
    for (let index = 0; index < size; index++) {
      this.record[index] = (this.record[index] as number) - mean;
    }
    return computeMagnitudeSpectrum(this.record, this.scratch);
  }
}
