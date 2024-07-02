// import { ADB } from './components/ADB-old'
import { ADB } from './components/ADB-new'
// import ADBe from './ADBe'

function App() {
  return (
    <div className="container mx-auto p-4 flex flex-col items-center">
      {/* <h1 className="text-2xl font-bold mb-4">ADBeeper2</h1> */}
      <ADB />
    </div>
  )
}

export default App

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function Caca() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Archive Product</CardTitle>
        <CardDescription>
          Lipsum dolor sit amet, consectetur adipiscing elit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div></div>
        <Button size="sm" variant="secondary">
          Archive Product
        </Button>
      </CardContent>
    </Card>
  )
}
