# Change Log
## [0.3.0]
- Added support for usbipd version 4.x.x
- UsbIPD version is checked at the start of vscode to provide backward compatibility with version 3.x.x
- Change attached criteria to be based upon ClientIPAddress being not null instead of ClientWslInstance which is gone
- Updated details when attaching/detaching to show Attached if attached, Detached if detached and nothing if not binded, attempt to attach will give user an error recommending to bind as per changes in usbipd version 4.0.0
## [0.2.0]
- Use `usbipd state` instead of `usbipd wsl list` to get the list of device
- When the usb device is physically disconnected, pressing detached will hide the button if no more device is attached
## [0.1.0]
- Initial release