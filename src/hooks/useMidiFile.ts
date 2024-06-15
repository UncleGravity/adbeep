import { useState, useCallback } from "react";
import { Midi } from '@tonejs/midi';
import { convertMidiToSequence } from "@/lib/utils";

const useMidiFile = () => {
  const [midiFileName, setMidiFileName] = useState<string | null>(null);
  const [sequence, setSequence] = useState<[number, number][]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setMidiFileName(file.name);
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);

      const sequence = convertMidiToSequence(midi.tracks[0].notes);
      setSequence(sequence);
    }
  }, []);

  return { midiFileName, sequence, onDrop };
};

export default useMidiFile;