import { QueryStringMachine } from "scenerystack/query-string-machine";
import { NOISE_SETTINGS } from "../LockInAmplifierConstants.js";
import LockInAmplifierNamespace from "../LockInAmplifierNamespace.js";

const parameters = QueryStringMachine.getAll({
  mainsFrequency: {
    type: "number",
    defaultValue: NOISE_SETTINGS.MAINS_FREQUENCIES.NORTH_AMERICA,
    validValues: Object.values(NOISE_SETTINGS.MAINS_FREQUENCIES),
    public: true,
  },
  seed: { type: "number", defaultValue: NOISE_SETTINGS.DEFAULT_SEED, isValidValue: Number.isInteger, public: true },
});
LockInAmplifierNamespace.register("lockInAmplifierQueryParameters", parameters);
export default parameters;
