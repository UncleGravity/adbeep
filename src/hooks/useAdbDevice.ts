import { useState, useEffect, useCallback } from "react";
import { AdbDaemonWebUsbDevice, ADB_DEFAULT_DEVICE_FILTER, AdbDaemonWebUsbDeviceManager, AdbDaemonWebUsbDeviceWatcher } from "@yume-chan/adb-daemon-webusb";
import { AdbPacketData, AdbPacketInit, AdbDaemonTransport, Adb } from "@yume-chan/adb";
import { Consumable, ReadableWritablePair, WritableStream, DecodeUtf8Stream } from "@yume-chan/stream-extra";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";

const useAdbDevice = () => {
  const Manager: AdbDaemonWebUsbDeviceManager | undefined = AdbDaemonWebUsbDeviceManager.BROWSER;
  const [device, setDevice] = useState<AdbDaemonWebUsbDevice | undefined>(undefined);

  useEffect(() => {
    if (!Manager) {
      alert("WebUSB is not supported in this browser");
      return;
    }

    const handleDeviceChange = (addedDeviceSerial?: string) => {
      if (addedDeviceSerial) {
        console.log(`Device added: ${addedDeviceSerial}`);
      } else {
        console.log("Device removed");
      }
    };

    const watcher = new AdbDaemonWebUsbDeviceWatcher(handleDeviceChange, navigator.usb);

    return () => {
      watcher.dispose();
    };
  }, [Manager]);

  const connectDevice = useCallback(async () => {
    if (!Manager) return;

    try {
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

      const connection: ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>> = await requestedDevice.connect();
      const CredentialStore: AdbWebCredentialStore = new AdbWebCredentialStore("Hammerhead");
      const transport: AdbDaemonTransport = await AdbDaemonTransport.authenticate({
        serial: requestedDevice.serial,
        connection,
        credentialStore: CredentialStore,
      });

      const adb: Adb = new Adb(transport);
      setDevice(requestedDevice);

      return adb;
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotFoundError") {
        alert("No device selected");
        return;
      }
      throw e;
    }
  }, [Manager]);

  const executeCommand = useCallback(async (adb: Adb, command: string, callback: (output: string) => void) => {
    const process = await adb.subprocess.spawn(command);
    await process.stdout.pipeThrough(new DecodeUtf8Stream()).pipeTo(
      new WritableStream<string>({
        write(chunk) {
          callback(chunk);
        },
      }),
    );
  }, []);

  return { device, connectDevice, executeCommand };
};

export default useAdbDevice;