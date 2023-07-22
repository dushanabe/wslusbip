import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	const inputString = `
	BUSID  VID:PID    DEVICE                                                        STATE
	 1-2    1462:7d25  USB Input Device                                              Not attached
	 1-20   152d:1561  USB Attached SCSI (UAS) Mass Storage Device                   Not attached
	 4-2    1532:006c  USB Input Device, Razer Mamba Elite                           Not attached
	 4-3    046d:082c  Logi C615 HD WebCam                                           Not attached
	 4-4    046d:c343  USB Input Device                                              Not attached
	 1-3    2e8a:0006  USB Serial Device (COM4), USB Serial Device (COM3)            Attached - Ubuntu-22.04
	`;

	test('Parsing test', () => {
		let parsedDevices = myExtension.parseUSBDevices(inputString);
		assert.strictEqual(parsedDevices.length, 7);
		assert.strictEqual(parsedDevices[0].busID, '1-2');
		assert.strictEqual(parsedDevices[0].state, 'Not attached');
		assert.strictEqual(parsedDevices[6].busID, '1-3');
		assert.strictEqual(parsedDevices[6].state, 'Attached - Ubuntu-22.04');
	});
});
