import { HotkeyData } from "scenerystack/scenery";
import { AccessibleValueHandlerHotkeyDataCollection as valueKeys } from "scenerystack/sun";
import { StringManager } from "../i18n/StringManager.js";

const help = StringManager.getInstance().getInstrumentStrings().a11y.keyboard;
const repoName = "lock-in-amplifier";

export const LockInAmplifierHotkeyData = {
  knobFine: new HotkeyData({
    keys: ["shift+arrowLeft", "shift+arrowRight"],
    keyboardHelpDialogLabelStringProperty: help.fineStringProperty,
    repoName,
  }),
  knobCoarse: new HotkeyData({
    keys: [
      ...valueKeys.PAGE_UP_HOTKEY_DATA.keyStringProperties,
      ...valueKeys.PAGE_DOWN_HOTKEY_DATA.keyStringProperties,
    ],
    keyboardHelpDialogLabelStringProperty: help.coarseStringProperty,
    repoName,
  }),
  autoPhase: new HotkeyData({
    keys: ["alt+shift+a"],
    repoName,
    global: true,
    keyboardHelpDialogLabelStringProperty: help.autoPhaseStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: help.autoPhaseKeysStringProperty,
  }),
  record: new HotkeyData({
    keys: ["alt+shift+r"],
    repoName,
    global: true,
    keyboardHelpDialogLabelStringProperty: help.recordStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: help.recordKeysStringProperty,
  }),
  step: new HotkeyData({
    keys: ["alt+shift+s"],
    repoName,
    global: true,
    keyboardHelpDialogLabelStringProperty: help.stepStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: help.stepKeysStringProperty,
  }),
};
