import { ImageLayer as ImageLayerType } from "@/types/canvas";

interface ImageLayerProps {
  id: string;
  layer: ImageLayerType;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  selectionColor?: string;
}

export const ImageLayer = ({
  id,
  layer,
  onPointerDown,
  selectionColor,
}: ImageLayerProps) => {
  return (
    <image
      href={layer.src}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      preserveAspectRatio="none"
      onPointerDown={(e) => onPointerDown(e, id)}
      style={{
        outline: selectionColor ? `2px solid ${selectionColor}` : "none",
      }}
    />
  );
};
