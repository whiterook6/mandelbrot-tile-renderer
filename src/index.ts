import { getScreenPosition, initialCamera, panCamera, zoomCamera, type Camera } from "./camera";
import { fitCanvasToLayout, getCanvas, getScreen } from "./canvas";
import type { Screen } from "./tile";

const main = () => {
  const { canvas, context } = getCanvas("tile-canvas");
  fitCanvasToLayout(canvas);
  const devicePixelRatio = window.devicePixelRatio || 1;

  const drawDebugRectangle = (worldX: number, worldY: number, width: number, height: number) => {
    const screen: Screen = getScreen(canvas);
    const topLeft = getScreenPosition(camera, screen, { worldX, worldY });
    const bottomRight = getScreenPosition(camera, screen, { worldX: worldX + width, worldY: worldY + height });
    const x = Math.round(topLeft.screenX);
    const y = Math.round(topLeft.screenY);
    const w = Math.round(bottomRight.screenX - topLeft.screenX);
    const h = Math.round(bottomRight.screenY - topLeft.screenY);
    context.fillStyle = "red";
    context.fillRect(x, y, w, h);
  };

  const clearCanvas = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  let camera: Camera = {...initialCamera};
  const handleWheel = (event: WheelEvent) => {
    const screen: Screen = getScreen(canvas);
    camera = zoomCamera(camera, screen, {
      cursorX: event.clientX * devicePixelRatio,
      cursorY: event.clientY * devicePixelRatio,
      deltaY: event.deltaY,
    });
    clearCanvas();
    drawDebugRectangle(0, 0, 50, 50);
  };
  window.addEventListener("wheel", handleWheel);

  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging){
      return;
    }

    camera = panCamera(camera, {
      movementX: event.movementX * devicePixelRatio,
      movementY: event.movementY * devicePixelRatio,
    });
    clearCanvas();
    drawDebugRectangle(0, 0, 50, 50);
  }

  let isDragging = false;
  const handleMouseUp = () => {
    isDragging = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }
  const handleMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return;
    isDragging = true;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };  

  window.addEventListener("mousedown", handleMouseDown);

  drawDebugRectangle(0, 0, 50, 50);
}

main();