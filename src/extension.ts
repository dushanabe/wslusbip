import * as vscode from 'vscode';

import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

interface USBDevice {
	busID: string;
	vidPid: string;
	device: string;
	state: string;
}

export function parseUSBDevices(inputString: string): USBDevice[] {
	const lines = inputString.split('\n').map((line) => line.trim()).filter(Boolean);
	const headers = lines.shift()?.split(/\s{2,}/).map((header) => header.trim()) || [];
	const usbDevices: USBDevice[] = [];

	for (const line of lines) {
		const data = line.split(/\s{2,}/);
		const usbDevice: USBDevice = {
			busID: data[0].trim(),
			vidPid: data[1].trim(),
			device: data[2].trim(),
			state: data[3].trim(),
		};
		usbDevices.push(usbDevice);
	}

	return usbDevices;
}

var getUsbipList = async function getUsbipList() {
	// Exec output contains both stderr and stdout outputs
	const deviceliststr = await exec('usbipd.exe wsl list');

	/* 
	*  The output of the command is a string parse it to get the device list
	*  example output:
	* BUSID  VID:PID    DEVICE                                                        STATE
	* 1-2    1462:7d25  USB Input Device                                              Not attached
	*/

	// Parse the output to get the device list
	const devices = parseUSBDevices(deviceliststr.stdout.trim());
	console.log(devices);

	return {
		devices: devices
	};
};

async function checkAttachedDevices(): Promise<USBDevice[]> {
	let attachedDevices: USBDevice[] = [];
	try {
	  const liststr: any = await getUsbipList();
	  const parsedDevices = liststr.devices;
  
	  if (parsedDevices.length === 0) {
		// No devices attached
	  } else {
		for (const device of parsedDevices) {
		  if (device.state.includes("Attached")) {
			attachedDevices.push(device);
		  }
		}
	  }
	} catch (error) {
	  // Handle any errors that occurred during the getUsbipList() operation
	  console.error("Error checking attached device:", error);
	}
  
	return attachedDevices;
  }

function showUSBDevices(): Thenable<vscode.QuickPickItem | undefined> {
	return getUsbipList().then((liststr: any) => {
		const parsedDevices = liststr.devices;

		if (parsedDevices.length === 0) {
			vscode.window.showInformationMessage('No USB devices found.');
			return Promise.resolve(undefined);
		}

		const items: vscode.QuickPickItem[] = parsedDevices.map((device: USBDevice) => ({
			label: `${device.busID}`,
			description: device.device,
			detail: device.state,
		}));

		return vscode.window.showQuickPick(items, { canPickMany: false, placeHolder: 'Select a USB Device' });
	});
}

function showAttachedUSBDevices(): Thenable<vscode.QuickPickItem | undefined> {
	return getUsbipList().then((liststr: any) => {
		const parsedDevices = liststr.devices;

		if (parsedDevices.length === 0) {
			vscode.window.showInformationMessage('No USB devices found.');
			return Promise.resolve(undefined);
		}

		// Check if any device is attached
		let attachedDevices: USBDevice[] = [];
		for (const device of parsedDevices) {
			if (device.state.includes("Attached")) {
				attachedDevices.push(device);
			}
		}

		const items: vscode.QuickPickItem[] = attachedDevices.map((device: USBDevice) => ({
			label: `${device.busID}`,
			description: device.device,
			detail: device.state,
		}));

		return vscode.window.showQuickPick(items, { canPickMany: false, placeHolder: 'Select a USB Device' });
	});
}

async function attachUsbToWSL(busid: string) {
	try {
		await exec(`usbipd.exe wsl attach --busid=${busid}`);
	} catch (error) {
		vscode.window.showErrorMessage('Error while attaching USB device:' + error);
	}
}

async function detachUsbFromWSL(busid: string) {
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
		if (attachedDevices.length > 0) {
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
			if (attachedDevices.length === 1) {
				vscode.window.showInformationMessage(`Detaching device: ${attachedDevices[0].device}`);
				detachUsbFromWSL(attachedDevices[0].busID);
				detachBarItem.hide();
			}
			else if(attachedDevices.length > 1){
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
			}
		});
	});

	context.subscriptions.push(cmdAttach);
	context.subscriptions.push(cmdDetach);

}

export function deactivate() { }

