import { useCallback, useState, useEffect } from "react";
import { useDropzone } from 'react-dropzone';
import { Midi } from '@tonejs/midi';
import useAdbDevice from "../hooks/useAdbDevice";
import { WritableStream, DecodeUtf8Stream } from "@yume-chan/stream-extra";
import { Adb } from "@yume-chan/adb";
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { convertMidiToSequence, MARIO_THEME } from "@/lib/utils";
import { toast } from "sonner"
import MidiVisualizer from "@/components/MIDI/MidiVisualizer";
import { TerminalDrawer } from "@/components/Shell/TerminalDrawer";

export function ADB() {
  const { device, connectDevice } = useAdbDevice();
  const [adb, setAdb] = useState<Adb | null>(null);
  const [ready, setReady] = useState(false);
  const [midi, setMidi] = useState<Midi | null>(null);
  const [sequence, setSequence] = useState<[number, number][]>(MARIO_THEME);
  const [output, setOutput] = useState<string>('');
  const [midiFileName, setMidiFileName] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<number>(0);

  const demoFiles = [
    "1up.mid",
    "death.mid",
    "ending.mid",
    "game-over.mid",
    "zelda-idk.mid"
  ];

  const [selectedDemoFile, setSelectedDemoFile] = useState("zelda-idk.mid");

  const loadMidiFile = useCallback(async (filePath: string) => {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const currentMidi = new Midi(arrayBuffer);
    setMidi(currentMidi);

    console.log("TRACKS: ", currentMidi.tracks);

    // Find the first non-empty track
    const firstNonEmptyTrackIndex = currentMidi.tracks.findIndex(track => track.notes.length > 0);
    if (firstNonEmptyTrackIndex !== -1) {
      const sequence = convertMidiToSequence(currentMidi.tracks[firstNonEmptyTrackIndex].notes);
      setSequence(sequence);
      setSelectedTrack(firstNonEmptyTrackIndex);
      console.log(`Auto-selected Track: ${firstNonEmptyTrackIndex}`);
      console.log(sequence);
    }
  }, []);

  useEffect(() => {
    // Load the selected demo MIDI file on component mount or when selectedDemoFile changes
    loadMidiFile(`/midi/${selectedDemoFile}`);
  }, [loadMidiFile, selectedDemoFile]);

  const handleDemoFileChange = (value: string) => {
    setSelectedDemoFile(value);
  };

  const handleConnectClick = async () => {
    if (device) {
      console.log("Device already connected");
      toast.error("Device already connected");
      return;
    }

    const adb = await connectDevice();
    if (adb) {
      setAdb(adb);
      setReady(true);
    }
  };

  const handleSendSequenceClick = async () => {
    if (adb && sequence.length > 0) {
      const tones = sequence.flatMap(([frequency, duration]) => [duration, frequency]);
      const command = `am broadcast -a io.hammerhead.action.CMD_LINE_AUDIO_ALERT --eia tones ${tones.join(',')}`;
      
      setIsSending(true);
      setOutput('');
      try {
        const process = await adb.subprocess.spawn(command);
        await process.stdout.pipeThrough(new DecodeUtf8Stream()).pipeTo(
          new WritableStream<string>({
            write(chunk) {
              setOutput(prev => prev + chunk);
            },
          })
        );

        // Update current time
        let elapsedTime = 0;
        const totalDuration = sequence.reduce((sum, [_, duration]) => sum + duration, 0);
        const interval = setInterval(() => {
          elapsedTime += 10;
          setCurrentTime(elapsedTime / 1000); // Convert to seconds
          if (elapsedTime >= totalDuration) {
            clearInterval(interval);
            setIsSending(false);
          }
        }, 10);
      } catch (error) {
        console.error("Error sending sequence:", error);
        toast.error("Failed to send sequence");
        setIsSending(false);
      }
    } else {
      console.log("ADB not connected or sequence is empty");
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setMidiFileName(file.name);
      await loadMidiFile(URL.createObjectURL(file));
    }
  }, [loadMidiFile]);

  useEffect(() => {
    // Load a default MIDI file on component mount
    loadMidiFile('/midi/zelda-idk.mid');

  }, [loadMidiFile]);

  const handleTrackChange = (value: string) => {
    const trackNumber = parseInt(value, 10);
    setSelectedTrack(trackNumber);
    if (midi) {
      const newSequence = convertMidiToSequence(midi.tracks[trackNumber].notes);
      console.log("Selected Track: ", trackNumber);
      console.log(newSequence);
      setSequence(newSequence);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.mid', '.midi'],
    },
    maxFiles: 1,
  });

  return (
    <Card className="p-4">
      <CardHeader>
        {/* <CardTitle>Archive Product</CardTitle> */}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-4">ADB Device</h3>

            <div className="flex gap-4 w-full mb-4">

              <div className="flex-1">
                <Button id="connect-button" onClick={handleConnectClick}>Select Device</Button>
              </div>

              <div className="flex-1">
                <TerminalDrawer adb={adb} />
              </div>

            </div>

            <div className="status-badge p-2 rounded-md mb-4">
              <span className={`text-green-800 ${device ? 'text-green-00' : 'text-red-500'}`}>
                ●
              </span>
              {device ? ' Connected' : ' Disconnected'}
            </div>

            {device && <p className="text-green-600">Selected device: {device.serial}</p>}

            <Button id="send-sequence-button" onClick={handleSendSequenceClick} disabled={!ready || isSending} className="mb-4 w-full">Send Sequence</Button>
            
            {output && (
              <div className="mt-4 p-2 bg-gray-100 rounded">
                <h4 className="font-bold">Output:</h4>
                <pre className="whitespace-pre-wrap">{output}</pre>
              </div>
            )}

            <h3 className="text-lg font-bold">Select MIDI File</h3>
            <h4 className="text-sm text-gray-500 mb-2">Select one of the example files, or upload your own below</h4>
            <Select value={selectedDemoFile} onValueChange={handleDemoFileChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Demo MIDI File" />
              </SelectTrigger>
              <SelectContent>
                {demoFiles.map((file, index) => (
                  <SelectItem key={index} value={file}>
                    {file}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div {...getRootProps()} className={cn('h-32 p-4 border-dashed border-2 rounded-md my-4 flex items-center justify-center cursor-pointer', isDragActive ? 'border-blue-500 bg-blue-100' : 'border-gray-300')}>
              <input {...getInputProps()} />
              <p className="text-sm text-gray-500 text-center">
                {midiFileName ? midiFileName : 'Drag & drop a MIDI file here, or click to select one'}
              </p>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold mb-4">MIDI</h3>
            {midi && (
              <>
                <Select value={selectedTrack.toString()} onValueChange={handleTrackChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Track" />
                  </SelectTrigger>
                  <SelectContent>
                    {midi.tracks.map((track, index) => (
                      <SelectItem key={index} value={index.toString()} disabled={track.notes.length === 0}>
                        {`Track ${index} ${track.notes.length === 0 ? '(Empty)' : ''}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <MidiVisualizer midi={midi} currentTime={currentTime} highlightChannel={selectedTrack} />
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}