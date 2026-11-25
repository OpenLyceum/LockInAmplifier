/** Contract for a Lab experiment. The shared Lab pipeline adds input noise and demodulates. */
import type { Random } from "scenerystack/dot";
import type { ReferenceOscillator } from "../../../common/model/ReferenceOscillator.js";

export interface LabScenario {
  /** Internal scenario identifier. */
  readonly id: string;
  /** Physical parameters hidden until Reveal. */
  readonly hiddenParameters: Readonly<Record<string, number>>;
  /** Clean input voltage at time t in seconds. */
  inputAt(t: number, ref: ReferenceOscillator): number;
  /** Choose new hidden parameters from the supplied seeded stream. */
  randomize(random: Random): void;
  /** Return a snapshot of the quantities shown when the unknowns are revealed. */
  reveal(): Record<string, number>;
}
