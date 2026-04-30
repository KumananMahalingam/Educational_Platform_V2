export async function captureCanvas(): Promise<string | null> {
  try {
    const svg = document.querySelector("svg.h-\\[100vh\\]") as SVGSVGElement | null;
    if (!svg) {
      return null;
    }

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load serialized svg"));
    });
    img.src = url;
    await loaded;

    const canvas = document.createElement("canvas");
    canvas.width = img.width || window.innerWidth;
    canvas.height = img.height || window.innerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return null;
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl.replace(/^data:image\/png;base64,/, "");
  } catch {
    return null;
  }
}
