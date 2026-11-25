import { type HotkeyData, KeyboardListener, type Node } from "scenerystack/scenery";
import { KeyboardHelpSection, KeyboardHelpSectionRow } from "scenerystack/scenery-phet";
import { LockInAmplifierHotkeyData as keys } from "../LockInAmplifierHotkeyData.js";
import { instrumentStrings } from "./instrumentText.js";

const help = instrumentStrings.a11y.keyboard;

export function instrumentActionHelp(...actions: HotkeyData[]): KeyboardHelpSection {
  return new KeyboardHelpSection(
    help.actionsStringProperty,
    actions.map((action) => KeyboardHelpSectionRow.fromHotkeyData(action)),
  );
}

export function instrumentKnobHelp(fine: boolean): KeyboardHelpSection {
  const coarseRow = KeyboardHelpSectionRow.fromHotkeyData(keys.knobCoarse, {
    labelStringProperty: help.coarseStringProperty,
    pdomLabelStringProperty: help.coarseKeysStringProperty,
  });
  return new KeyboardHelpSection(help.knobsStringProperty, [
    ...(fine
      ? [
          KeyboardHelpSectionRow.fromHotkeyData(keys.knobFine, {
            pdomLabelStringProperty: help.fineKeysStringProperty,
          }),
        ]
      : []),
    coarseRow,
  ]);
}

export function bindInstrumentAction(button: Node, hotkey: HotkeyData, fire: () => void): void {
  const listener = KeyboardListener.createGlobal(button, {
    keys: hotkey.keyStringProperties.map((key) => key.value),
    fire,
  });
  button.disposeEmitter.addListener(() => listener.dispose());
}
