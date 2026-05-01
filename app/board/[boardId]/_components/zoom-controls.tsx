"use client";

import { Maximize, Minus, Plus } from "lucide-react";

import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const ZoomControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: ZoomControlsProps) => {
  const percent = Math.round(zoom * 100);

  return (
    <div className="absolute bottom-4 right-[400px] z-30 flex items-center gap-1 rounded-xl bg-neutral-900 border border-white/10 shadow-xl p-1 select-none">
      <Hint label="Zoom out" side="top">
        <Button
          variant="board"
          size="icon"
          onClick={onZoomOut}
          className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg h-8 w-8"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </Hint>

      <Hint label="Reset zoom" side="top">
        <button
          type="button"
          onClick={onResetZoom}
          className="min-w-[56px] text-center text-xs font-medium text-white/80 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 tabular-nums"
        >
          {percent}%
        </button>
      </Hint>

      <Hint label="Zoom in" side="top">
        <Button
          variant="board"
          size="icon"
          onClick={onZoomIn}
          className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg h-8 w-8"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </Hint>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      <Hint label="Fit to screen (reset)" side="top">
        <Button
          variant="board"
          size="icon"
          onClick={onResetZoom}
          className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg h-8 w-8"
          aria-label="Reset zoom"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </Hint>
    </div>
  );
};
