"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Clapperboard, Image as ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RenderFormat = 'png' | 'mp4';
export type RenderResolution = '720p' | '1080p' | 'square';

export interface RenderRequest {
  format: RenderFormat;
  includeBackground: boolean;
  backgroundColor: string;
  durationSeconds: number;
  frameRate: number;
  resolution: RenderResolution;
}

interface RenderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRender: (request: RenderRequest) => void;
  isRendering?: boolean;
  defaultBackgroundColor: string;
  renderProgress?: number;
  renderStatus?: string;
}

const resolutionOptions: Array<{ id: RenderResolution; label: string; size: string }> = [
  { id: '720p', label: 'HD', size: '1280 x 720' },
  { id: '1080p', label: 'Full HD', size: '1920 x 1080' },
  { id: 'square', label: 'Square', size: '1080 x 1080' },
];

export const RenderDialog: React.FC<RenderDialogProps> = ({
  isOpen,
  onOpenChange,
  onRender,
  isRendering = false,
  defaultBackgroundColor,
  renderProgress = 0,
  renderStatus,
}) => {
  const [format, setFormat] = React.useState<RenderFormat>('png');
  const [includeBackground, setIncludeBackground] = React.useState(false);
  const [backgroundColor, setBackgroundColor] = React.useState(defaultBackgroundColor || '#121214');
  const [durationSeconds, setDurationSeconds] = React.useState(6);
  const [frameRate, setFrameRate] = React.useState(30);
  const [resolution, setResolution] = React.useState<RenderResolution>('720p');

  React.useEffect(() => {
    if (isOpen) {
      setBackgroundColor(defaultBackgroundColor || '#121214');
    }
  }, [defaultBackgroundColor, isOpen]);

  React.useEffect(() => {
    if (format === 'mp4' && !includeBackground) {
      setIncludeBackground(true);
    }
  }, [format, includeBackground]);

  const submit = () => {
    onRender({
      format,
      includeBackground,
      backgroundColor,
      durationSeconds,
      frameRate,
      resolution,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] bg-[#121214] border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Clapperboard className="w-4 h-4 text-primary" />
            Render Export
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Choose output settings before exporting your animation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {isRendering && (
            <section className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <Label className="text-white/80">Render Progress</Label>
                <span className="text-white/70">{Math.round(renderProgress)}%</span>
              </div>
              <Progress value={renderProgress} className="h-2 bg-white/10 [&>div]:bg-primary" />
              <p className="text-[11px] text-white/55">
                {renderStatus || 'Rendering...'}
              </p>
            </section>
          )}

          <section className="space-y-2">
            <Label className="text-white/80">Format</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left transition-all',
                  format === 'png'
                    ? 'border-primary bg-primary/15 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="w-4 h-4" />
                  PNG
                </span>
                <p className="text-xs text-white/40 mt-1">Single high-quality frame.</p>
              </button>
              <button
                type="button"
                onClick={() => setFormat('mp4')}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left transition-all',
                  format === 'mp4'
                    ? 'border-primary bg-primary/15 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Video className="w-4 h-4" />
                  MP4
                </span>
                <p className="text-xs text-white/40 mt-1">Video export with chosen length.</p>
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <Label className="text-white/80">Resolution</Label>
            <div className="grid grid-cols-3 gap-2">
              {resolutionOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setResolution(option.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left transition-all',
                    resolution === option.id
                      ? 'border-primary bg-primary/15 text-white'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  )}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-[11px] text-white/40">{option.size}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">Background</Label>
                <p className="text-xs text-white/45">
                  {format === 'mp4'
                    ? 'MP4 transparency is not supported, so background is always enabled.'
                    : 'Include a solid background in the export.'}
                </p>
              </div>
              <Switch
                checked={includeBackground}
                onCheckedChange={setIncludeBackground}
                disabled={format === 'mp4'}
              />
            </div>
            <div className={cn('flex items-center gap-2 transition-opacity', includeBackground ? 'opacity-100' : 'opacity-40')}>
              <Label htmlFor="render-bg-color" className="text-xs text-white/60">
                Color
              </Label>
              <input
                id="render-bg-color"
                type="color"
                value={backgroundColor}
                disabled={!includeBackground}
                onChange={event => setBackgroundColor(event.target.value)}
                className="h-8 w-14 bg-transparent border border-white/20 rounded-md p-1"
              />
              <span className="text-xs text-white/50 font-mono">{backgroundColor}</span>
            </div>
          </section>

          {format === 'mp4' && (
            <section className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <Label className="text-white/80">Length</Label>
                  <span className="text-white/60">{durationSeconds}s</span>
                </div>
                <Slider
                  value={[durationSeconds]}
                  min={2}
                  max={20}
                  step={1}
                  onValueChange={value => setDurationSeconds(value[0] || 6)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <Label className="text-white/80">Frame Rate</Label>
                  <span className="text-white/60">{frameRate} FPS</span>
                </div>
                <Slider
                  value={[frameRate]}
                  min={12}
                  max={60}
                  step={6}
                  onValueChange={value => setFrameRate(value[0] || 30)}
                />
              </div>
            </section>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => onOpenChange(false)}
            disabled={isRendering}
          >
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isRendering}>
            {isRendering ? 'Rendering...' : 'Render'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
