import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { useAtomValue, useSetAtom } from 'jotai'
import { devicesAtom, selectedDeviceIdAtom, midiSourceAtom, serverConnectedAtom, serverDevicesAtom, selectedServerDeviceAtom, serverMaxRateAtom, type MidiSource } from '@/atoms/midiAtoms'
import { bpmAtom, clockSourceAtom, type ClockSource } from '@/atoms/clockAtoms'
import { scaleAtom, type UiScale } from '@/atoms/uiAtoms'

interface AppSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SCALES: { value: UiScale; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'normal', label: 'Normal' },
  { value: 'big', label: 'Big' },
]

export function AppSettingsDialog({ open, onOpenChange }: AppSettingsDialogProps) {
  const devices = useAtomValue(devicesAtom)
  const selectedDeviceId = useAtomValue(selectedDeviceIdAtom)
  const setSelectedDevice = useSetAtom(selectedDeviceIdAtom)
  const bpm = useAtomValue(bpmAtom)
  const setBpm = useSetAtom(bpmAtom)
  const clockSource = useAtomValue(clockSourceAtom)
  const setClockSource = useSetAtom(clockSourceAtom)
  const scale = useAtomValue(scaleAtom)
  const setScale = useSetAtom(scaleAtom)
  const midiSource = useAtomValue(midiSourceAtom)
  const setMidiSource = useSetAtom(midiSourceAtom)
  const serverConnected = useAtomValue(serverConnectedAtom)
  const serverDevices = useAtomValue(serverDevicesAtom)
  const selectedServerDevice = useAtomValue(selectedServerDeviceAtom)
  const setSelectedServerDevice = useSetAtom(selectedServerDeviceAtom)
  const serverMaxRate = useAtomValue(serverMaxRateAtom)
  const setServerMaxRate = useSetAtom(serverMaxRateAtom)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ui-chrome sm:max-w-[400px] bg-black/95 border-border p-6">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">Application settings</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-2">
          <div className="space-y-2">
            <Label>UI Scale</Label>
            <ButtonGroup>
              {SCALES.map((s) => (
                <Button
                  key={s.value}
                  size="xs"
                  variant="outline"
                  className={scale === s.value
                    ? 'bg-white/15 text-white border-white/20'
                    : 'bg-black text-white/70 border-white/10 hover:bg-white/10 hover:text-white'}
                  onClick={() => setScale(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <div className="space-y-2">
            <Label>MIDI Device</Label>
            <Select
              value={selectedDeviceId ?? '__none__'}
              onValueChange={(v) => setSelectedDevice(v === '__none__' ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name || d.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              MIDI Source
              {midiSource !== 'local' && (
                <span className={`w-2 h-2 rounded-full ${serverConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              )}
            </Label>
            <ButtonGroup>
              {(['local', 'server', 'all'] as const).map((src) => (
                <Button
                  key={src}
                  size="xs"
                  variant="outline"
                  className={midiSource === src
                    ? 'bg-white/15 text-white border-white/20'
                    : 'bg-black text-white/70 border-white/10 hover:bg-white/10 hover:text-white'}
                  onClick={() => setMidiSource(src as MidiSource)}
                >
                  {src === 'local' ? 'Local' : src === 'server' ? 'Server' : 'All'}
                </Button>
              ))}
            </ButtonGroup>
            <p className="text-xs text-white/50">
              {midiSource === 'local' && 'WebMIDI (browser)'}
              {midiSource === 'server' && 'Server via WebSocket'}
              {midiSource === 'all' && 'Both local and server'}
            </p>
          </div>

          {(midiSource === 'server' || midiSource === 'all') && (
            <>
              <div className="space-y-2">
                <Label>Server Device</Label>
                <Select
                  value={selectedServerDevice ?? '__all__'}
                  onValueChange={(v) => setSelectedServerDevice(v === '__all__' ? null : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All devices</SelectItem>
                    {serverDevices.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Update Rate</Label>
                <ButtonGroup>
                  {[10, 20, 30, 60].map((rate) => (
                    <Button
                      key={rate}
                      size="xs"
                      variant="outline"
                      className={serverMaxRate === rate
                        ? 'bg-white/15 text-white border-white/20'
                        : 'bg-black text-white/70 border-white/10 hover:bg-white/10 hover:text-white'}
                      onClick={() => setServerMaxRate(rate)}
                    >
                      {rate}Hz
                    </Button>
                  ))}
                </ButtonGroup>
                <p className="text-xs text-white/50">
                  Lower = less CPU, more latency
                </p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Clock Source</Label>
            <ButtonGroup>
              {(['manual', 'midi'] as const).map((src) => (
                <Button
                  key={src}
                  size="xs"
                  variant="outline"
                  className={clockSource === src
                    ? 'bg-white/15 text-white border-white/20'
                    : 'bg-black text-white/70 border-white/10 hover:bg-white/10 hover:text-white'}
                  onClick={() => setClockSource(src as ClockSource)}
                >
                  {src === 'manual' ? 'Manual' : 'MIDI Clock'}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          {clockSource === 'manual' && (
            <div className="space-y-2">
              <Label>BPM</Label>
              <Input
                type="number"
                min={20}
                max={300}
                value={bpm}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v) && v >= 20 && v <= 300) setBpm(v)
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-24"
              />
            </div>
          )}

          {clockSource === 'midi' && (
            <div className="text-xs text-white">
              BPM: {bpm} (from MIDI clock)
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
