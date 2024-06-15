import React, { useEffect, useRef } from 'react';
import { Midi } from '@tonejs/midi';

interface MidiVisualizerProps {
  midi: Midi;
  highlightChannel?: number;
  currentTime?: number;
}

const MidiVisualizer: React.FC<MidiVisualizerProps> = ({ midi, highlightChannel = 0, currentTime = 0 }) => {
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

      requestRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [midi, highlightChannel, currentTime]);

  return <canvas ref={canvasRef} width="800" height="400" />;
};

export default MidiVisualizer;