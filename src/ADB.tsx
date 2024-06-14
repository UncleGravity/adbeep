import { useCallback, useState, useRef } from "react";
import { useDropzone } from 'react-dropzone';
import { Midi, Note } from '@tonejs/midi';
import useAdbDevice from "./hooks/useAdbDevice";
import { ReadableWritablePair, WritableStream, DecodeUtf8Stream, Consumable, WritableStreamDefaultWriter } from "@yume-chan/stream-extra";
import { AdbSubprocessProtocol } from "@yume-chan/adb";
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { convertMidiToSequence, MARIO_THEME } from "@/lib/utils";
import { toast } from "sonner"


export function ADB() {
  const { device, connectDevice, executeCommand } = useAdbDevice();
  const [output, setOutput] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [sequence, setSequence] = useState<[number, number][]>(MARIO_THEME);
  const processRef = useRef<AdbSubprocessProtocol | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Consumable<Uint8Array>> | null>(null);
  const [midiFileName, setMidiFileName] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleConnectClick = async () => {
    if (device) {
      console.log("Device already connected");
      toast.error("Device already connected");
      return;
    }

    const adb = await connectDevice();
    if (adb) {
      const process = await adb.subprocess.spawn("/vendor/bin/hw/vendor.hammerhead.testapp.sh");
      processRef.current = process;

      processRef.current.stdout.pipeThrough(new DecodeUtf8Stream()).pipeTo(
        new WritableStream<string>({
          async write(chunk) {
            console.log(chunk);
            if (chunk.includes("^C to exit.") && processRef.current) {
              writerRef.current = processRef.current.stdin.getWriter();
              setReady(true);
            }
          },
        }),
      );
    }
  };

  const handleSendSequenceClick = async () => {
    if (processRef.current && writerRef.current) {
      let command = 'v\n';
      let totalDuration = 0;
      for (const [frequency, duration] of sequence) {
        command += `b\n${frequency}\n${duration}\n`;
        totalDuration += duration;
      }
      console.log(command);
      setIsSending(true);
      await writerRef.current.write(new Consumable(new TextEncoder().encode(command)));
      setTimeout(() => setIsSending(false), totalDuration);
    } else {
      console.log("process not ready");
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setMidiFileName(file.name);
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);

      // Process the MIDI file
      // const notes = midi.tracks.flatMap(track => track.notes);
      console.log(midi.tracks);
      const sequence = convertMidiToSequence(midi.tracks[0].notes);
      setSequence(sequence);
      console.log(sequence);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.mid', '.midi'],
    },
    maxFiles: 1,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Archive Product</CardTitle>
        {/* <CardDescription>
          Lipsum dolor sit amet, consectetur adipiscing elit.
        </CardDescription> */}
      </CardHeader>
      <CardContent>
        
        <Button id="connect-button" onClick={handleConnectClick}>Select USB Device</Button>
        {device && <p>Selected device: {device.serial}</p>}
        <pre>{output}</pre>
        <Button id="send-sequence-button" onClick={handleSendSequenceClick} disabled={!ready || isSending}>Send Sequence</Button>
        <div>Status: {device ? 'Connected' : 'Disconnected'}</div>

        <div {...getRootProps()} className={cn('p-4 border-dashed border-2 rounded-md', isDragActive ? 'border-blue-500 bg-blue-100' : 'border-gray-300', { 'cursor-pointer': device })}>
          <input {...getInputProps()} />
          <p className="text-sm text-gray-500 text-center">
            {midiFileName ? midiFileName : 'Drag & drop a MIDI file here, or click to select one'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default { ADB };