/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { FilteringScreen } from "./filtering/FilteringScreen.js";
import { StringManager } from "./i18n/StringManager.js";
import LockInAmplifierColors from "./LockInAmplifierColors.js";
import { VirtualExperimentScreen } from "./lab/VirtualExperimentScreen.js";
import { MixingScreen } from "./mixing/MixingScreen.js";
import { PhaseDetectionScreen } from "./phase/PhaseDetectionScreen.js";
import { LockInAmplifierPreferencesModel } from "./preferences/LockInAmplifierPreferencesModel.js";
import { LockInAmplifierPreferencesNode } from "./preferences/LockInAmplifierPreferencesNode.js";
import { SignalAndNoiseScreen } from "./signal-and-noise/SignalAndNoiseScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();

  // Simulation-specific preferences; initial values come from lockInAmplifierQueryParameters.
  const simPreferences = new LockInAmplifierPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  const screens = [
    new SignalAndNoiseScreen({
      preferences: simPreferences,
      name: stringManager.getScreenNames().signalAndNoiseStringProperty,
      tandem: Tandem.ROOT.createTandem("signalAndNoiseScreen"),
      backgroundColorProperty: LockInAmplifierColors.backgroundColorProperty,
    }),
    new MixingScreen({
      name: stringManager.getScreenNames().mixingStringProperty,
      tandem: Tandem.ROOT.createTandem("mixingScreen"),
      backgroundColorProperty: LockInAmplifierColors.backgroundColorProperty,
    }),
    new FilteringScreen({
      name: stringManager.getScreenNames().filteringStringProperty,
      tandem: Tandem.ROOT.createTandem("filteringScreen"),
      backgroundColorProperty: LockInAmplifierColors.backgroundColorProperty,
    }),
    new PhaseDetectionScreen({
      name: stringManager.getScreenNames().phaseStringProperty,
      tandem: Tandem.ROOT.createTandem("phaseScreen"),
      backgroundColorProperty: LockInAmplifierColors.backgroundColorProperty,
    }),
    new VirtualExperimentScreen({
      preferences: simPreferences,
      name: stringManager.getScreenNames().labStringProperty,
      tandem: Tandem.ROOT.createTandem("labScreen"),
      backgroundColorProperty: LockInAmplifierColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new LockInAmplifierPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),

    // Optional: fill in credits shown in Help → About
    credits: {
      leadDesign: "",
      softwareDevelopment: "",
      team: "",
      qualityAssurance: "",
    },
  });

  sim.start();
});
