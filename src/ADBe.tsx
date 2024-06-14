import { AdbDaemonWebUsbDevice, ADB_DEFAULT_DEVICE_FILTER, AdbDaemonWebUsbDeviceWatcher } from "@yume-chan/adb-daemon-webusb";
import { AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";
import { AdbPacketData, AdbPacketInit, AdbDaemonTransport, Adb } from "@yume-chan/adb";
import { Consumable, ReadableWritablePair, WritableStream,DecodeUtf8Stream } from "@yume-chan/stream-extra";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import { useEffect, useState } from "react";

const ADBe = () => {
  const Manager: AdbDaemonWebUsbDeviceManager | undefined = AdbDaemonWebUsbDeviceManager.BROWSER;
  const [device, setDevice] = useState<AdbDaemonWebUsbDevice | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!Manager) {
      alert("WebUSB is not supported in this browser");
      return;
    } else {
      console.log("All good");
    }

    const handleButtonClick = async () => {
      try {

        // Request the device
        const requestedDevice: AdbDaemonWebUsbDevice | undefined = await Manager.requestDevice({
          filters: [
            {
              ...ADB_DEFAULT_DEVICE_FILTER,
              vendorId: 0x05c6,
              productId: 0x901d,
            }
          ]
        });

        if (!requestedDevice) {
          alert("No device selected");
          return;
        }

        // Connect to the device
        const connection: ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>> = await requestedDevice.connect();

        // Handle encryption
        const CredentialStore: AdbWebCredentialStore = new AdbWebCredentialStore("Hammerhead");
        const transport: AdbDaemonTransport = await AdbDaemonTransport.authenticate({
          serial: requestedDevice.serial,
          connection,
          credentialStore: CredentialStore,
        });

        // Create the ADB instance
        const adb: Adb = new Adb(transport);

        const process = await adb.subprocess.spawn("/vendor/bin/hw/vendor.hammerhead.testapp.sh");

        process.stdout.pipeThrough(new DecodeUtf8Stream()).pipeTo(
          new WritableStream<string>({
            async write(chunk) {
              console.log(chunk);
              if (chunk.includes("^C to exit.")) {
                setReady(true);
                // wait 5 seconds
                await new Promise(resolve => setTimeout(resolve, 2000));
                const writer = process.stdin.getWriter();
                await writer.write(new Consumable(new TextEncoder().encode('v\nb\n500\n500\nv\n')));

                await new Promise(resolve => setTimeout(resolve, 5000));
                await writer.write(new Consumable(new TextEncoder().encode('v\nb\n500\n500\nv\n')));
                console.log("done");
              }
            },
          }),
        );

        console.log("done");

        setDevice(requestedDevice);

      } catch (e) {
        if (e instanceof DOMException && e.name === "NotFoundError") {
          alert("No device selected");
          return;
        }
        throw e;
      }
    };

    const handleDeviceChange = (addedDeviceSerial?: string) => {
      if (addedDeviceSerial) {
        console.log(`Device added: ${addedDeviceSerial}`);
      } else {
        console.log("Device removed");
      }
    };

    const watcher = new AdbDaemonWebUsbDeviceWatcher(handleDeviceChange, navigator.usb);

    const button = document.getElementById("button");
    button?.addEventListener("click", handleButtonClick);

    return () => {
      button?.removeEventListener("click", handleButtonClick);
      watcher.dispose();
    };
  }, [Manager]);

  return (
    <div>
      <h2>Simple React Component</h2>
      <p>This is a simple component demonstrating a functional React component.</p>
      <button id="button">Select USB Device</button>
      {device && <p>Selected device: {device.serial}</p>}
    </div>
  );
};

export default ADBe;