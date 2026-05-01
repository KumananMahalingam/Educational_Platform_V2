export interface CanvasBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureCanvasOptions {
  /**
   * Bounding box (in canvas/world coordinates) of the region to capture. If
   * omitted, the function falls back to capturing just the viewport.
   */
  bounds?: CanvasBounds | null;
  /**
   * Current camera offset (in screen pixels). Required when `bounds` is
   * provided so we can compensate for the inner <g> transform.
   */
  camera?: { x: number; y: number };
  /**
   * Padding (in canvas units) added around the bounds before rendering.
   * Defaults to 60.
   */
  padding?: number;
  /**
   * Cap on the rendered output's longest side. Keeps the PNG sent to the
   * model bounded even when the user has scribbled across a huge area.
   * Defaults to 1600 px.
   */
  maxDim?: number;
}

export async function captureCanvas(
  options?: CaptureCanvasOptions
): Promise<string | null> {
  try {
    const svg = document.querySelector(
      "svg.h-\\[100vh\\]"
    ) as SVGSVGElement | null;
    if (!svg) {
      console.warn("[captureCanvas] svg element not found");
      return null;
    }

    const rect = svg.getBoundingClientRect();
    const viewportW = Math.max(1, Math.floor(rect.width || window.innerWidth));
    const viewportH = Math.max(1, Math.floor(rect.height || window.innerHeight));

    // Decide what region of canvas-space we're rendering. When bounds are
    // supplied, we render the union of all drawn content (with padding); when
    // they're not, we fall back to the current viewport.
    const padding = options?.padding ?? 60;
    const maxDim = options?.maxDim ?? 1600;

    let viewBoxX: number;
    let viewBoxY: number;
    let viewBoxW: number;
    let viewBoxH: number;
    let outW: number;
    let outH: number;
    let resetCameraTransform = false;

    if (options?.bounds) {
      // Render in canvas-space directly: we strip the camera transform off
      // the inner <g> below, so the viewBox is just the bounds (padded).
      viewBoxX = Math.floor(options.bounds.x - padding);
      viewBoxY = Math.floor(options.bounds.y - padding);
      viewBoxW = Math.max(1, Math.ceil(options.bounds.width + padding * 2));
      viewBoxH = Math.max(1, Math.ceil(options.bounds.height + padding * 2));
      resetCameraTransform = true;

      const scale = Math.min(1, maxDim / Math.max(viewBoxW, viewBoxH));
      outW = Math.max(1, Math.round(viewBoxW * scale));
      outH = Math.max(1, Math.round(viewBoxH * scale));
    } else {
      viewBoxX = 0;
      viewBoxY = 0;
      viewBoxW = viewportW;
      viewBoxH = viewportH;
      outW = viewportW;
      outH = viewportH;
    }

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(outW));
    clone.setAttribute("height", String(outH));
    clone.setAttribute(
      "viewBox",
      `${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`
    );

    if (resetCameraTransform) {
      // The inner <g> in canvas.tsx is translated by (camera.x, camera.y) to
      // pan content. To capture in pure canvas-space coords we neutralise
      // that transform on the clone.
      const innerG = clone.querySelector(":scope > g") as SVGGElement | null;
      if (innerG) {
        innerG.style.transform = "translate(0px, 0px)";
        innerG.removeAttribute("transform");
      }
    }

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clone);

    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.width = outW;
      img.height = outH;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(new Error("Failed to load serialized svg"));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return null;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(img, 0, 0, outW, outH);

      const dataUrl = canvas.toDataURL("image/png");
      return dataUrl.replace(/^data:image\/png;base64,/, "");
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    console.error("[captureCanvas] error", e);
    return null;
  }
}
