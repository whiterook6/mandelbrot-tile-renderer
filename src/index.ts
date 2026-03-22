function getTileCanvas(): HTMLCanvasElement {
  const el = document.getElementById("tile-canvas");
  if (!(el instanceof HTMLCanvasElement)) {
    throw new Error('Expected element with id "tile-canvas" to be an HTMLCanvasElement');
  }
  return el;
}

function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const c = canvas.getContext("2d");
  if (!c) {
    throw new Error("2D canvas context unavailable");
  }
  return c;
}

const canvas = getTileCanvas();
const ctx = get2dContext(canvas);

function fitCanvasToLayout() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener("resize", fitCanvasToLayout);
fitCanvasToLayout();
