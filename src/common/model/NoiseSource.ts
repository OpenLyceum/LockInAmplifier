/** Seeded input noise, with independent white, pink, mains and random-walk contributions. */
import { Random } from "scenerystack/dot";
import { optionize } from "scenerystack/phet-core";
import { NOISE_SETTINGS, SAMPLING_SETTINGS } from "../../LockInAmplifierConstants.js";

type PinkCorner = (typeof NOISE_SETTINGS.PINK_CORNERS)[keyof typeof NOISE_SETTINGS.PINK_CORNERS];
type MainsFrequency = (typeof NOISE_SETTINGS.MAINS_FREQUENCIES)[keyof typeof NOISE_SETTINGS.MAINS_FREQUENCIES];

type NoiseOptions = {
  seed?: number;
  whiteDensity?: number;
  pinkCorner?: PinkCorner;
  mainsAmplitude?: number;
  mainsFrequency?: MainsFrequency;
  driftRate?: number;
};

const { SAMPLE_RATE } = SAMPLING_SETTINGS;
const { PINK_POLES, PINK_MIN_CORNER, PINK_MAX_CORNER, MAINS_THIRD_HARMONIC_RATIO } = NOISE_SETTINGS;

export class NoiseSource {
  /** One-sided white input noise density in V/√Hz. */
  public whiteDensity: number;
  /** Fundamental mains pickup amplitude in V peak. */
  public mainsAmplitude: number;
  /** Mains fundamental in Hz. */
  public mainsFrequency: MainsFrequency;
  /** Random walk strength in V/√s. */
  public driftRate: number;

  private readonly random: Random;
  private readonly seed: number;
  private spareGaussian: number | null = null;
  private drift = 0;
  private readonly states = new Float64Array(PINK_POLES);
  private readonly decay = new Float64Array(PINK_POLES);
  private readonly innovations = new Float64Array(PINK_POLES);
  private corner: PinkCorner = NOISE_SETTINGS.PINK_CORNERS.OFF;
  private pinkGain = 0;
  private pinkPrimed = false;

  public constructor(providedOptions?: NoiseOptions) {
    const options = optionize<NoiseOptions>()(
      {
        seed: NOISE_SETTINGS.DEFAULT_SEED,
        whiteDensity: 0,
        pinkCorner: NOISE_SETTINGS.PINK_CORNERS.OFF,
        mainsAmplitude: 0,
        mainsFrequency: NOISE_SETTINGS.MAINS_FREQUENCIES.NORTH_AMERICA,
        driftRate: 0,
      },
      providedOptions,
    );
    this.seed = options.seed;
    this.random = new Random({ seed: this.seed });
    this.whiteDensity = options.whiteDensity;
    this.mainsAmplitude = options.mainsAmplitude;
    this.mainsFrequency = options.mainsFrequency;
    this.driftRate = options.driftRate;
    for (let pole = 0; pole < PINK_POLES; pole++) {
      const frequency = PINK_MIN_CORNER * (PINK_MAX_CORNER / PINK_MIN_CORNER) ** (pole / (PINK_POLES - 1));
      const exponent = (-2 * Math.PI * frequency) / SAMPLE_RATE;
      this.decay[pole] = Math.exp(exponent);
      this.innovations[pole] = Math.sqrt(-Math.expm1(2 * exponent));
    }
    this.pinkCorner = options.pinkCorner;
  }

  /** Pink/white crossover in Hz. Zero bypasses the pole bank. */
  public get pinkCorner(): PinkCorner {
    return this.corner;
  }

  public set pinkCorner(corner: PinkCorner) {
    this.corner = corner;
    if (corner === 0) {
      this.pinkPrimed = false;
      this.pinkGain = 0;
      return;
    }

    // Each AR(1) pole y = a·y + sqrt(1-a²)·N(0,1) has unit variance. Its one-sided PSD is
    // (2/fs)(1-a²)/|1-a exp(-j·2πf/fs)|². Independent poles add in PSD. For log-spaced corners,
    // the continuous Lorentzian approximation integrates as ∫df_c/(f_c²+f²) ∝ 1/f in the band.
    // Normalize the exact discrete sum at the selected crossover to equal the white PSD there.
    const frequencyTerm = 4 * Math.sin((Math.PI * corner) / SAMPLE_RATE) ** 2;
    let unitDensitySquared = 0;
    for (let pole = 0; pole < PINK_POLES; pole++) {
      const decay = this.decay[pole] as number;
      const innovation = this.innovations[pole] as number;
      unitDensitySquared += (innovation * innovation) / ((1 - decay) ** 2 + decay * frequencyTerm);
    }
    this.pinkGain = 1 / Math.sqrt((2 / SAMPLE_RATE) * unitDensitySquared);
  }

  /** Advance the stochastic processes by one sample and evaluate deterministic pickup at t seconds. */
  public sample(t: number): number {
    let voltage = this.whiteDensity === 0 ? 0 : this.whiteDensity * Math.sqrt(SAMPLE_RATE / 2) * this.gaussian();

    if (this.corner !== 0 && this.whiteDensity !== 0) {
      if (!this.pinkPrimed) {
        for (let pole = 0; pole < PINK_POLES; pole++) {
          this.states[pole] = this.gaussian();
        }
        this.pinkPrimed = true;
      }
      let sum = 0;
      for (let pole = 0; pole < PINK_POLES; pole++) {
        const state =
          (this.decay[pole] as number) * (this.states[pole] as number) +
          (this.innovations[pole] as number) * this.gaussian();
        this.states[pole] = state;
        sum += state;
      }
      voltage += this.whiteDensity * this.pinkGain * sum;
    }

    if (this.mainsAmplitude !== 0) {
      const phase = 2 * Math.PI * this.mainsFrequency * t;
      voltage += this.mainsAmplitude * (Math.sin(phase) + MAINS_THIRD_HARMONIC_RATIO * Math.sin(3 * phase));
    }

    if (this.driftRate !== 0) {
      this.drift += (this.driftRate / Math.sqrt(SAMPLE_RATE)) * this.gaussian();
    }
    return voltage + this.drift;
  }

  /** Rewind the seeded stream and stochastic state with the current settings. */
  public reset(): void {
    this.random.setSeed(this.seed);
    this.spareGaussian = null;
    this.pinkPrimed = false;
    this.drift = 0;
  }

  /** Box–Muller with an instance-local spare, so interleaved sources cannot share samples. */
  private gaussian(): number {
    if (this.spareGaussian !== null) {
      const sample = this.spareGaussian;
      this.spareGaussian = null;
      return sample;
    }
    const radius = Math.sqrt(-2 * Math.log(1 - this.random.nextDouble()));
    const angle = 2 * Math.PI * this.random.nextDouble();
    this.spareGaussian = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  }
}
