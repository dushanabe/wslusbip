import * as vscode from 'vscode';

import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

interface UsbDevice {
	BusId: string | null;
	ClientIPAddress: string | null;
	ClientWslInstance: string | null;
	Description: string;
	InstanceId: string;
	IsForced: boolean;
	PersistedGuid: string | null;
	StubInstanceId: string | null;
}

interface UsbDeviceList {
	Devices: UsbDevice[];
}

export function parseUSBDevices(inputString: string): UsbDeviceList | undefined {
	const fixedInputString = inputString.replace(/\\/g, "\\\\");
  try {
    console.log(fixedInputString);
    const parsedData: UsbDeviceList = JSON.parse(fixedInputString);
    // Now you can work with the filtered data
    console.log(parsedData);

    // Remove devices with null BusId
    const filteredDevices: UsbDeviceList = {
      Devices: parsedData.Devices.filter(
        (device) => device.BusId !== null
      ),
    };
    return filteredDevices;
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }
}

var getUsbipList = async function getUsbipList(): Promise<UsbDeviceList> {
	// Exec output contains both stderr and stdout outputs, use usbipd state instead
	const deviceliststr = await exec('usbipd.exe state');

	var devices = parseUSBDevices(deviceliststr.stdout.trim());
	if(devices === undefined)
	{
		vscode.window.showErrorMessage('Error while parsing USB device list.');
		devices = {Devices: []};
	}
	return devices;
};

async function checkAttachedDevices(): Promise<UsbDeviceList> {
	const devices = await getUsbipList();;

	const attachedDevices: UsbDeviceList = {
		Devices: devices.Devices.filter(device => device.ClientWslInstance !== null),
	  };
  
	return attachedDevices;
  }

function showUSBDevices(): Thenable<vscode.QuickPickItem | undefined> {
	return getUsbipList().then(devices => {
	  if (devices.Devices.length === 0) {
		vscode.window.showInformationMessage('No USB devices found.');
		return Promise.resolve(undefined);
	  }
  
	  const items: vscode.QuickPickItem[] = devices.Devices.map((device: UsbDevice) => ({
		label: `${device.BusId}`,
		description: device.Description,
		detail: device.ClientWslInstance || '', // Add the detail property if needed
	  }));
  
	  return vscode.window.showQuickPick(items, { canPickMany: false, placeHolder: 'Select a USB Device' });
	});
  }

  function showAttachedUSBDevices(): Thenable<vscode.QuickPickItem | undefined> {
	return checkAttachedDevices().then(devices => {
  
	  if (devices.Devices.length === 0) {
		vscode.window.showInformationMessage('No attached USB devices found.');
		return Promise.resolve(undefined);
	  }
  
	  const items: vscode.QuickPickItem[] = devices.Devices.map((device: UsbDevice) => ({
		label: `${device.BusId}`,
		description: device.Description,
		detail: device.ClientWslInstance || '', // Use clientWslInstance as the detail
	  }));
  
	  return vscode.window.showQuickPick(items, { canPickMany: false, placeHolder: 'Select an Attached USB Device' });
	});
  }

async function attachUsbToWSL(busid: string | null) {
	try {
		await exec(`usbipd.exe wsl attach --busid=${busid}`);
	} catch (error) {
		vscode.window.showErrorMessage('Error while attaching USB device:' + error);
	}
}

async function detachUsbFromWSL(busid: string | null) {
	// Exec output contains both stderr and stdout outputs
	try {
		await exec(`usbipd.exe wsl detach --busid=${busid}`);
	} catch (error) {
		vscode.window.showErrorMessage('Error while detaching USB device:' + error);
	}
}

export function activate(context: vscode.ExtensionContext) {

	const attachBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	attachBarItem.text = 'Attach';
	attachBarItem.command = 'uspip-connect.Attach';
	attachBarItem.tooltip = 'USBIP Attach USB device to WSL';
	attachBarItem.show();

	const detachBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	detachBarItem.text = 'Detach';
	detachBarItem.command = 'uspip-connect.Detach';
	detachBarItem.tooltip = 'USBIP Detach USB device from WSL';
	detachBarItem.hide();

	checkAttachedDevices().then((attachedDevices) => {
		if (attachedDevices.Devices.length > 0) {
			detachBarItem.show();
		}
	});

	let cmdAttach = vscode.commands.registerCommand('uspip-connect.Attach', () => {
		showUSBDevices().then((selectedItem) => {
			if (selectedItem) {
				vscode.window.showInformationMessage(`Device: ${selectedItem.label} (${selectedItem.description}) attached.`);
				attachUsbToWSL(selectedItem.label);
				detachBarItem.show();
			} else {
				vscode.window.showInformationMessage('No USB device selected.');
			}
		});
	});

	let cmdDetach = vscode.commands.registerCommand('uspip-connect.Detach', () => {
		checkAttachedDevices().then((attachedDevices) => {
			if (attachedDevices.Devices.length === 1) {
				vscode.window.showInformationMessage(`Detaching device: ${attachedDevices.Devices[0].BusId}`);
				detachUsbFromWSL(attachedDevices.Devices[0].BusId);
				detachBarItem.hide();
			}
			else if(attachedDevices.Devices.length > 1){
				showAttachedUSBDevices().then((selectedItem) => {
					if (selectedItem) {
						vscode.window.showInformationMessage(`Device: ${selectedItem.label} (${selectedItem.description}) detached.`);
						detachUsbFromWSL(selectedItem.label);
					} else {
						vscode.window.showInformationMessage('No USB device selected.');
					}
				});
			}
			else{
				vscode.window.showInformationMessage('No USB device attached.');
				detachBarItem.hide();
			}
		});
	});

	context.subscriptions.push(cmdAttach);
	context.subscriptions.push(cmdDetach);

}

export function deactivate() { }

