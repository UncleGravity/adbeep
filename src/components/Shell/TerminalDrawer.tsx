import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import TerminalComponent from "@/components/Shell/TerminalComponent";
import { Adb } from "@yume-chan/adb";
import { useState } from 'react'; // Import useState for managing open state

interface TerminalComponentProps {
    adb: Adb | null;
  }

export function TerminalDrawer({ adb }: TerminalComponentProps) {
  const [isOpen, setIsOpen] = useState(false); // State to control drawer visibility

  return (
    <Drawer modal={false} open={isOpen} onOpenChange={(state) => setIsOpen(state)}>
      <DrawerTrigger asChild>
        <Button variant="outline" disabled={!adb} onClick={() => setIsOpen(true)}>Open Terminal</Button>
      </DrawerTrigger>
      <DrawerContent className="bg-black">
        <div className="flex justify-between items-center absolute top-0 right-0 p-2">
          <Button className="text-white" variant="ghost" onClick={() => setIsOpen(false)}>X</Button> {/* Close button now absolutely positioned */}
        </div>
        <div className="pt-5">
          {adb && <TerminalComponent adb={adb} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}