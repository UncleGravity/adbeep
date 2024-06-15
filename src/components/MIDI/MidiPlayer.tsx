import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { Button } from "@/components/ui/button";

interface MidiPlayerProps {
  midi: Midi;
  highlightChannel?: number;
}

const MidiPlayer: React.FC<MidiPlayerProps> = ({ midi, highlightChannel = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { tracks, duration } = midi;
    const width = canvas.width;
    const height = canvas.height;
    const pixelsPerSecond = width / duration;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      tracks.forEach((track, trackIndex) => {
        track.notes.forEach(note => {
          const x = note.time * pixelsPerSecond;
          const y = height - (note.midi * height / 128);
          const noteHeight = height / 128;
          const noteWidth = note.duration * pixelsPerSecond;

          ctx.fillStyle = trackIndex === highlightChannel ? 'red' : 'black';
          ctx.fillRect(x, y, noteWidth, noteHeight);
        });
      });

      // Draw the moving vertical line
      const lineX = currentTime * pixelsPerSecond;
      ctx.strokeStyle = 'blue';
      ctx.beginPath();
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, height);
      ctx.stroke();

      requestRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [midi, highlightChannel, currentTime]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      if (isPaused) {
        Tone.getTransport().start();
        setIsPaused(false);
      } else {
        Tone.getTransport().pause();
        setIsPaused(true);
      }
    } else {
      await Tone.start();
      Tone.getTransport().cancel();  // Clear any previous events in the queue

      const polySynth = new Tone.PolySynth(Tone.Synth).toDestination();

      midi.tracks.forEach(track => {
        // Sort notes by their start time
        const sortedNotes = track.notes.slice().sort((a, b) => a.time - b.time);
        sortedNotes.forEach(note => {
          polySynth.triggerAttackRelease(note.name, note.duration, note.time);
        });
      });

      Tone.getTransport().start();
      setIsPlaying(true);
      setIsPaused(false);

      Tone.getTransport().scheduleRepeat(() => {
        setCurrentTime(Tone.getTransport().seconds);
      }, "0.1");
    }
  };

  const handleStop = () => {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().dispose();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
  };

  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
    };
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} width="800" height="400" />
      <Button onClick={handlePlayPause}>{isPlaying ? (isPaused ? 'Resume' : 'Pause') : 'Play'}</Button>
      <Button onClick={handleStop}>Stop</Button>
    </div>
  );
};

export default MidiPlayer;