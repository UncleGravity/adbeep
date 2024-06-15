import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { encodeUtf8, Adb, AdbSubprocessProtocol } from '@yume-chan/adb';
import { Consumable, WritableStream } from '@yume-chan/stream-extra';
import '@xterm/xterm/css/xterm.css';

interface TerminalComponentProps {
  adb: Adb;
}

const TerminalComponent: React.FC<TerminalComponentProps> = ({ adb }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const terminal = new Terminal();
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current!);

    const setupTerminal = async () => {
      const process: AdbSubprocessProtocol = await adb.subprocess.shell();
      process.stdout.pipeTo(
        new WritableStream<Uint8Array>({
          write(chunk) {
            terminal.write(chunk);
          },
        }),
      );

      const writer = process.stdin.getWriter();
      terminal.onData((data) => {
        const buffer = encodeUtf8(data);
        const consumable = new Consumable(buffer);
        writer.write(consumable);
      });

      handleResize(); // Initial fit
    };

    setupTerminal();

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, [adb]);

  return <div id="terminal" ref={terminalRef} style={{ width: '100%', height: '100%' }} />;
};

export default TerminalComponent;