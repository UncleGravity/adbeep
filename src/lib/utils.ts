import { Note } from "@tonejs/midi/dist/Note";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function midiNoteToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function convertMidiToSequence(notes: Note[]): [number, number][] {
  const sequence: [number, number][] = [];
  let lastTime = 0;

  notes.forEach(note => {
    const silenceDuration = Math.floor(note.time - lastTime);
    if (silenceDuration > 0) {
      sequence.push([0, silenceDuration * 1000]);
    }
    const frequency = Math.floor(midiNoteToFrequency(note.midi));
    sequence.push([frequency, Math.floor(note.duration * 1000)]);
    lastTime = note.time + note.duration;
  });

  return sequence;
}

export const MARIO_THEME: [number, number][] = [
  [659, 80],  // E4
  [0, 40],    // Rest
  [659, 80],  // E4
  [0, 160],   // Rest
  [659, 80],  // E4
  [0, 160],   // Rest
  [523, 80],  // C4
  [0, 39],    // Rest
  [659, 80],  // E4
  [0, 160],   // Rest
  [784, 80],  // G4
  [0, 400],   // Rest
  [392, 80],  // G3
  [0, 400]    // Rest
];
