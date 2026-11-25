import { Property } from "scenerystack/axon";
import { NumberIO, type Tandem } from "scenerystack/tandem";
import { NOISE_SETTINGS } from "../LockInAmplifierConstants.js";
import LockInAmplifierNamespace from "../LockInAmplifierNamespace.js";
import parameters from "./lockInAmplifierQueryParameters.js";

const frequencies = NOISE_SETTINGS.MAINS_FREQUENCIES;
type MainsFrequency = (typeof frequencies)[keyof typeof frequencies];

export class LockInAmplifierPreferencesModel {
  public readonly mainsFrequencyProperty: Property<MainsFrequency>;

  public constructor(tandem?: Tandem) {
    this.mainsFrequencyProperty = new Property<MainsFrequency>(
      parameters.mainsFrequency === frequencies.EUROPE ? frequencies.EUROPE : frequencies.NORTH_AMERICA,
      {
        validValues: Object.values(frequencies),
        phetioValueType: NumberIO,
        ...(tandem && { tandem: tandem.createTandem("mainsFrequencyProperty") }),
      },
    );
  }
}

LockInAmplifierNamespace.register("LockInAmplifierPreferencesModel", LockInAmplifierPreferencesModel);
