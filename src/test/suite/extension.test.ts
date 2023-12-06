import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	const inputString = `
	{
		"Devices": [
		  {
			"BusId": null,
			"ClientIPAddress": null,
			"Description": "Unknown USB Device (Device Descriptor Request Failed)",
			"InstanceId": "USB\\VID_0000&PID_0002\\5&323A54A6&0&8",
			"IsForced": true,
			"PersistedGuid": "cde76219-59ef-4c9f-b56b-d523d923f220",
			"StubInstanceId": null
		  },
		  {
			"BusId": "3-2",
			"ClientIPAddress": null,
			"Description": "Logi C615 HD WebCam",
			"InstanceId": "USB\\VID_046D&PID_082C\\A3653020",
			"IsForced": false,
			"PersistedGuid": null,
			"StubInstanceId": null
		  },
		  {
			"BusId": "3-4",
			"ClientIPAddress": null,
			"Description": "USB Input Device",
			"InstanceId": "USB\\VID_046D&PID_C343\\01EDBCD8",
			"IsForced": false,
			"PersistedGuid": null,
			"StubInstanceId": null
		  },
		  {
			"BusId": null,
			"ClientIPAddress": null,
			"Description": "CP2102N USB to UART Bridge Controller",
			"InstanceId": "USB\\VID_10C4&PID_EA60\\A845D1285219EC11B5F43CBFF95A09B1",
			"IsForced": false,
			"PersistedGuid": "a57364a5-ce03-4f7e-9b84-eac47dd753f9",
			"StubInstanceId": null
		  },
		  {
			"BusId": "1-2",
			"ClientIPAddress": null,
			"Description": "USB Input Device",
			"InstanceId": "USB\\VID_1462&PID_7D25\\A02021081203",
			"IsForced": false,
			"PersistedGuid": null,
			"StubInstanceId": null
		  },
		  {
			"BusId": null,
			"ClientIPAddress": null,
			"Description": "USB Mass Storage Device",
			"InstanceId": "USB\\VID_14CD&PID_1212\\121220160204",
			"IsForced": false,
			"PersistedGuid": "ae88b7d2-5956-466e-b5e3-920638606a4d",
			"StubInstanceId": null
		  },
		  {
			"BusId": "1-20",
			"ClientIPAddress": null,
			"Description": "USB Attached SCSI (UAS) Mass Storage Device",
			"InstanceId": "USB\\VID_152D&PID_1561\\MSFT30DB9876543214E",
			"IsForced": false,
			"PersistedGuid": null,
			"StubInstanceId": null
		  },
		  {
			"BusId": "3-3",
			"ClientIPAddress": null,
			"Description": "USB Input Device, Razer Mamba Elite",
			"InstanceId": "USB\\VID_1532&PID_006C\\6&28CD5A7F&0&3",
			"IsForced": false,
			"PersistedGuid": null,
			"StubInstanceId": null
		  },
		  {
			"BusId": null,
			"ClientIPAddress": null,
			"Description": "USB Serial Device (COM4), USB Serial Device (COM3)",
			"InstanceId": "USB\\VID_2E8A&PID_0006\\E66058388310712E",
			"IsForced": false,
			"PersistedGuid": "a555488a-336d-41ff-a791-04ff24385657",
			"StubInstanceId": null
		  },
		  {
			"BusId": "1-8",
			"ClientIPAddress": "172.23.93.103",
			"Description": "USB Serial Device (COM5), USB JTAG/serial debug unit",
			"InstanceId": "USB\\VID_303A&PID_1001\\34:85:18:71:79:34",
			"IsForced": false,
			"PersistedGuid": "514a502d-8cc1-466f-b7e7-da6886737b69",
			"StubInstanceId": "USB\\Vid_80EE&Pid_CAFE\\34:85:18:71:79:34"
		  },
		  {
			"BusId": null,
			"ClientIPAddress": null,
			"Description": "USB Serial Device (COM7), USB JTAG/serial debug unit",
			"InstanceId": "USB\\VID_303A&PID_1001\\7C:DF:A1:E2:64:CC",
			"IsForced": false,
			"PersistedGuid": "9e985441-b7d6-4dd5-bda8-eaebeefa1a05",
			"StubInstanceId": null
		  },
		  {
			"BusId": "4-3",
			"ClientIPAddress": null,
			"Description": "Intel(R) Wireless Bluetooth(R)",
			"InstanceId": "USB\\VID_8087&PID_0032\\6&5B147F5&0&3",
			"IsForced": false,
			"PersistedGuid": null,
			"StubInstanceId": null
		  }
		]
	  }
	`;

	test('Parsing test', () => {
		const parsedDevices = myExtension.parseUSBDevices(inputString.trim());
		console.log(parsedDevices);
		if(parsedDevices === undefined)
		{
			console.log("JSON Parsing Error");
		}
		else{
			assert(parsedDevices !== undefined);
			assert.strictEqual(parsedDevices.Devices.length, 7);
			assert.strictEqual(parsedDevices.Devices[2].BusId, '1-2');
		}
	});
});
