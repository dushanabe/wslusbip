import { get } from 'http';
import { getgid } from 'process';
import * as vscode from 'vscode';

const { promisify } = require('util');
const exec = promisify(require('child_process').exec)

interface USBDevice {
	BUSID: string;
	VID_PID: string;
	DEVICE: string;
	STATE: string;
}

export function activate(context: vscode.ExtensionContext) {


	function parseUSBDevices(inputString: string): USBDevice[] {
		const lines = inputString.split('\n').map((line) => line.trim()).filter(Boolean);
		const headers = lines.shift()?.split(/\s{2,}/).map((header) => header.trim()) || [];
		const usbDevices: USBDevice[] = [];

		for (const line of lines) {
			const data = line.split(/\s{2,}/);
			const usbDevice: USBDevice = {
				BUSID: data[0].trim(),
				VID_PID: data[1].trim(),
				DEVICE: data[2].trim(),
				STATE: data[3].trim(),
			};
			usbDevices.push(usbDevice);
		}

		return usbDevices;
	}

	var getUsbipList = async function getUsbipList() {
		// Exec output contains both stderr and stdout outputs
		const deviceliststr = await exec('usbipd.exe wsl list')

		/* 
		*  The output of the command is a string parse it to get the device list
		*  example output:
		* BUSID  VID:PID    DEVICE                                                        STATE
		* 1-2    1462:7d25  USB Input Device                                              Not attached
		* 1-20   152d:1561  USB Attached SCSI (UAS) Mass Storage Device                   Not attached
		* 4-2    1532:006c  USB Input Device, Razer Mamba Elite                           Not attached
		* 4-3    046d:082c  Logi C615 HD WebCam                                           Not attached
		* 4-4    046d:c343  USB Input Device                                              Not attached
		* 5-3    8087:0032  Intel(R) Wireless Bluetooth(R)                                Not attached
		*/

		// Parse the output to get the device list
		const devices = parseUSBDevices(deviceliststr.stdout.trim());
		console.log(devices);

		return {
			devices: devices
		}
	};

	function showUSBDevices(): Thenable<vscode.QuickPickItem | undefined> {
		return getUsbipList().then((liststr: any) => {
			const parsedDevices = liststr.devices;

			if (parsedDevices.length === 0) {
				vscode.window.showInformationMessage('No USB devices found.');
				return Promise.resolve(undefined);
			}

			const items: vscode.QuickPickItem[] = parsedDevices.map((device: USBDevice) => ({
				label: `${device.BUSID}`,
				description: device.DEVICE,
				detail: device.STATE,
			}));

			return vscode.window.showQuickPick(items, { canPickMany: false, placeHolder: 'Select a USB Device' });
		});
	}

	async function attachUsbToWSL(busid: string) {
		// Exec output contains both stderr and stdout outputs
		try {
			// Assuming `exec` is a function that returns a Promise
			await exec(`usbipd.exe wsl attach --busid=${busid}`);
			vscode.window.showInformationMessage('Successfully attached USB device!');
		} catch (error) {
			vscode.window.showErrorMessage('Error while attaching USB device:' + error);
			// Handle the error or take appropriate action
		}
	}

	console.log('Congratulations, your extension "wslusbip" is now active!');
	const pres = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left)
	pres.text = 'USB IP Connect'
	pres.command = 'wslusbip.connect'
	pres.show()

	let disposable = vscode.commands.registerCommand('wslusbip.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from wslusbip!');
	}
	);
	context.subscriptions.push(disposable);

	let connect_command = vscode.commands.registerCommand('wslusbip.connect', () => {
		showUSBDevices().then((selectedItem) => {
			if (selectedItem) {
				vscode.window.showInformationMessage(`Selected device: ${selectedItem.label} (${selectedItem.detail})`);
				attachUsbToWSL(selectedItem.label);
			} else {
				vscode.window.showInformationMessage('No USB device selected.');
			}
		});
	}
	);
	context.subscriptions.push(connect_command);

}

export function deactivate() { }
