import * as vscode from "vscode";

import { promisify } from "util";

const exec = promisify(require("child_process").exec);

/**
 * Represents a USBIP device returnt from state command.
 */
interface UsbDevice {
  BusId: string | null;
  ClientIPAddress: string | null;
  Description: string;
  InstanceId: string;
  IsForced: boolean;
  PersistedGuid: string | null;
  StubInstanceId: string | null;
}

interface UsbDeviceList {
  Devices: UsbDevice[];
}

/**
 * Parses the input string and returns a filtered list of USB devices.
 * 
 * @param inputString - The input string to parse.
 * @returns The filtered list of USB devices, or undefined if parsing fails.
 */
export function parseUSBDevices(
  inputString: string
): UsbDeviceList | undefined {
  const fixedInputString = inputString.replace(/\\/g, "\\\\");
  try {
    console.log(fixedInputString);
    const parsedData: UsbDeviceList = JSON.parse(fixedInputString);
    // Now you can work with the filtered data
    console.log(parsedData);

    // Remove devices with null BusId
    const filteredDevices: UsbDeviceList = {
      Devices: parsedData.Devices.filter((device) => device.BusId !== null),
    };
    return filteredDevices;
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }
}

/**
 * Retrieves the list of USB devices using usbipd state.
 * @returns A promise that resolves to a UsbDeviceList object.
 */
var getUsbipList = async function getUsbipList(): Promise<UsbDeviceList> {
  // Exec output contains both stderr and stdout outputs, use usbipd state instead
  const deviceliststr = await exec("usbipd.exe state");

  var devices = parseUSBDevices(deviceliststr.stdout.trim());
  if (devices === undefined) {
    vscode.window.showErrorMessage("Error while parsing USB device list.");
    devices = { Devices: [] };
  }
  return devices;
};

async function checkUSBIPDVersion(): Promise<string> {
  const deviceliststr = await exec("usbipd.exe --version");
  // format : 4.0.0+182.Branch.master.Sha.2ffe37ec799b9e73eb9d23d051d980fefb616ce1
  // split on first + and return first part
  return deviceliststr.stdout.trim().split("+")[0];
}


/**
 * Retrieves a list of attached USB devices.
 * 
 * @returns A promise that resolves to a UsbDeviceList object containing the attached devices.
 */
async function checkAttachedDevices(): Promise<UsbDeviceList> {
  const devices = await getUsbipList();
  var attachedDevices: UsbDeviceList;

  attachedDevices = {
    Devices: devices.Devices.filter(
      (device) => device.ClientIPAddress !== null
    ),
  };
  console.log(attachedDevices);
  return attachedDevices;
}

/**
 * Retrieves a list of USB devices and displays them in a quick pick menu.
 * @returns A promise that resolves to the selected USB device or undefined if no devices are found.
 */
function showUSBDevices(): Thenable<vscode.QuickPickItem | undefined> {
  return getUsbipList().then((devices) => {
    if (devices.Devices.length === 0) {
      vscode.window.showInformationMessage(
        "No USB devices found. Check if usbipd is running."
      );
      return Promise.resolve(undefined);
    }

    
    const items: vscode.QuickPickItem[] = devices.Devices.map(
      (device: UsbDevice) => ({
        label: `${device.BusId}`,
        description: device.Description,
        // detail "Attached if ClientIPAddress is not null else not attached"
        detail: device.ClientIPAddress ? "Attached" : device.PersistedGuid ? "Detached" : "",
      })
    );

    return vscode.window.showQuickPick(items, {
      canPickMany: false,
      placeHolder: "Select a USB Device",
    });
  });
}

/**
 * Retrieves the list of attached USB devices and displays them in a quick pick menu.
 * If no devices are found, it shows an information message.
 * 
 * @returns A promise that resolves to the selected USB device or undefined if no device is selected.
 */
function showAttachedUSBDevices(): Thenable<vscode.QuickPickItem | undefined> {
  return checkAttachedDevices().then((devices) => {
    if (devices.Devices.length === 0) {
      vscode.window.showInformationMessage("No attached USB devices found.");
      return Promise.resolve(undefined);
    }

    const items: vscode.QuickPickItem[] = devices.Devices.map(
      (device: UsbDevice) => ({
        label: `${device.BusId}`,
        description: device.Description,
        detail: device.ClientIPAddress || "", // Use ClientIPAddress as the detail
      })
    );

    return vscode.window.showQuickPick(items, {
      canPickMany: false,
      placeHolder: "Select an Attached USB Device",
    });
  });
}

/**
 * Attaches a USB device to WSL using the specified bus ID.
 * @param busid The bus ID of the USB device to attach.
 */
async function attachUsbToWSL(cmd: string | undefined, busid: string | null):  Promise<boolean> {
  try {
    if (cmd === undefined) {
      vscode.window.showErrorMessage("Error while attaching USB device: USBIPD command not set");
      return false;
    }
    await exec(`${cmd} --busid=${busid}`);
  } catch (error) {
    vscode.window.showErrorMessage("Error while attaching USB device:" + error);
    return false;
  }
  return true;
}

/**
 * Detaches a USB device from WSL using the specified bus ID.
 * 
 * @param busid The bus ID of the USB device to detach.
 */
async function detachUsbFromWSL(cmd: string | undefined, busid: string | null) {
  // Exec output contains both stderr and stdout outputs
  try {
    if (cmd === undefined) {
      vscode.window.showErrorMessage("Error while detaching USB device: USBIPD command not set");
      return;
    }
    await exec(`${cmd} --busid=${busid}`);
  } catch (error) {
    vscode.window.showErrorMessage("Error while detaching USB device:" + error);
  }
}

/**
 * Activates the extension.
 * @param context - The extension context.
 */
export function activate(context: vscode.ExtensionContext) {
  const attachBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  attachBarItem.text = "Attach";
  attachBarItem.command = "uspip-connect.Attach";
  attachBarItem.tooltip = "USBIP Attach USB device to WSL";
  attachBarItem.show();

  const detachBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  detachBarItem.text = "Detach";
  detachBarItem.command = "uspip-connect.Detach";
  detachBarItem.tooltip = "USBIP Detach USB device from WSL";
  detachBarItem.hide();

  checkUSBIPDVersion().then((version) => {
    // Check if version is 4.0.0 or greater
    if (version.split(".")[0] >= "4") {
      context.globalState.update("uspipdAttachCmd", "usbipd.exe attach --wsl");
      context.globalState.update("uspipdDetachCmd", "usbipd.exe detach");
    } else {
      context.globalState.update("uspipdAttachCmd", "usbipd.exe wsl attach");
      context.globalState.update("uspipdDetachCmd", "usbipd.exe wsl detach");
      // deprecation warning
      vscode.window.showWarningMessage("Your version of usbipd is will not be supported in future release. Please upgrade to version 4.0.0 or greater.");
    }
  });

  checkAttachedDevices().then((attachedDevices) => {
    if (attachedDevices.Devices.length > 0) {
      for (let i = 0; i < attachedDevices.Devices.length; i++) {
        console.log(attachedDevices.Devices[i].BusId);
      }
      detachBarItem.show();
    }
  });

  let cmdAttach = vscode.commands.registerCommand(
    "uspip-connect.Attach",
    () => {
      var attached = false;
      showUSBDevices().then((selectedItem) => {
        if (selectedItem) {
          attachUsbToWSL(
            context.globalState.get("uspipdAttachCmd"),
            selectedItem.label
          ).then(
            (result) => {
              if (result) {
                vscode.window.showInformationMessage(
                  `Device: ${selectedItem.label} (${selectedItem.description}) attached.`
                );
                detachBarItem.show();
              }
            }
          );
        } else {
          vscode.window.showInformationMessage("No USB device selected.");
        }
      });
    }
  );

  let cmdDetach = vscode.commands.registerCommand(
    "uspip-connect.Detach",
    () => {
      checkAttachedDevices().then((attachedDevices) => {
        if (attachedDevices.Devices.length === 1) {
          vscode.window.showInformationMessage(
            `Detaching device: ${attachedDevices.Devices[0].BusId}`
          );
          detachUsbFromWSL(
            context.globalState.get("uspipdDetachCmd"),
            attachedDevices.Devices[0].BusId
          );
          detachBarItem.hide();
        } else if (attachedDevices.Devices.length > 1) {
          showAttachedUSBDevices().then((selectedItem) => {
            if (selectedItem) {
              vscode.window.showInformationMessage(
                `Device: ${selectedItem.label} (${selectedItem.description}) detached.`
              );
              detachUsbFromWSL(
                context.globalState.get("uspipdDetachCmd"),
                selectedItem.label
              );
            } else {
              vscode.window.showInformationMessage("No USB device selected.");
            }
          });
        } else {
          vscode.window.showInformationMessage("No USB device attached.");
          detachBarItem.hide();
        }
      });
    }
  );

  let cmdSetHost = vscode.commands.registerCommand(
    "uspip-connect.SetHost",
    () => {
      // Give the user an entry box to enter the host IP address or hostname and store it as a configuration value
      vscode.window
        .showInputBox({
          prompt: "Enter the USBIP host IP address or hostname",
          placeHolder: "Not Yet Implemented",
          value: "",
        })
        .then((value) => {
          if (value) {
            context.globalState.update("usbipHost", value);

            vscode.window.showInformationMessage(
              `USBIP host set to ${context.globalState.get("usbipHost")}`
            );
          }
          else {
            vscode.window.showInformationMessage(
              `USBIP host not set`
            );
          }
        });

  }
  );

  context.subscriptions.push(cmdAttach);
  context.subscriptions.push(cmdDetach);
  context.subscriptions.push(cmdSetHost);
}

/**
 * Deactivates the extension.
 * If there are attached devices, it detaches them from WSL.
 */
export function deactivate(context: vscode.ExtensionContext) {
  // if there is attached devices then detach them
  checkAttachedDevices().then((attachedDevices) => {
    if (attachedDevices.Devices.length >= 1) {
      for (let i = 0; i < attachedDevices.Devices.length; i++) {
        console.log(attachedDevices.Devices[i].BusId);
        detachUsbFromWSL(
          context.globalState.get("uspipdDetachCmd"),
          attachedDevices.Devices[i].BusId
        );
      }
    }
  });
}
