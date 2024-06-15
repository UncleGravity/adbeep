import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import TerminalComponent from "@/components/Shell/TerminalComponent";
import { Adb } from "@yume-chan/adb";

interface TerminalComponentProps {
    adb: Adb | null;
  }

export function TerminalDrawer({ adb }: TerminalComponentProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" disabled={!adb}>Open Terminal</Button>
      </DrawerTrigger>
      <DrawerContent className="bg-black">
        <div className="pt-5">
          {adb && <TerminalComponent adb={adb} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}