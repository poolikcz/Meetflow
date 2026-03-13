import { Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { useSettingsContext } from '../lib/SettingsContext';

export function SettingsPopover() {
  const { settings, updateSettings } = useSettingsContext();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Nastavení">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Nastavení</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <p className="text-sm font-semibold">Nastavení zobrazení</p>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Formát data
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="h-auto min-h-8 whitespace-normal px-2 py-1 text-center leading-tight"
                variant={settings.dateFormat === 'eu' ? 'default' : 'outline'}
                onClick={() => updateSettings({ dateFormat: 'eu' })}
              >
                EU (DD.MM.YYYY)
              </Button>
              <Button
                size="sm"
                className="h-auto min-h-8 whitespace-normal px-2 py-1 text-center leading-tight"
                variant={settings.dateFormat === 'us' ? 'default' : 'outline'}
                onClick={() => updateSettings({ dateFormat: 'us' })}
              >
                US (MM/DD/YYYY)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Formát času
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="h-auto min-h-8 whitespace-normal px-2 py-1 text-center leading-tight"
                variant={settings.timeFormat === '24h' ? 'default' : 'outline'}
                onClick={() => updateSettings({ timeFormat: '24h' })}
              >
                24h
              </Button>
              <Button
                size="sm"
                className="h-auto min-h-8 whitespace-normal px-2 py-1 text-center leading-tight"
                variant={settings.timeFormat === '12h' ? 'default' : 'outline'}
                onClick={() => updateSettings({ timeFormat: '12h' })}
              >
                12h (AM/PM)
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
