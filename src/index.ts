import { initialCamera, panCamera, zoomCamera, type Camera } from "./camera";
import { fitCanvasToLayout, getCanvas, getScreen } from "./canvas";
import { Renderer } from "./renderer";
import type { Screen } from "./tile";

const main = () => {
  const { canvas, context } = getCanvas("tile-canvas");
  const renderer = new Renderer(context);

  fitCanvasToLayout(canvas);
  const devicePixelRatio = window.devicePixelRatio || 1;

  let camera: Camera = { ...initialCamera };
  const handleWheel = (event: WheelEvent) => {
    const screen: Screen = getScreen(canvas);
    camera = zoomCamera(camera, screen, {
      cursorX: event.clientX * devicePixelRatio,
      cursorY: event.clientY * devicePixelRatio,
      deltaY: event.deltaY,
    });

    renderer.render(camera, screen);
  };
  window.addEventListener("wheel", handleWheel);

  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging) {
      return;
    }

    const screen: Screen = getScreen(canvas);
    camera = panCamera(camera, {
      movementX: event.movementX * devicePixelRatio,
      movementY: event.movementY * devicePixelRatio,
    });

    renderer.render(camera, screen);
  };

  let isDragging = false;
  const handleMouseUp = () => {
    isDragging = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };
  const handleMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return;
    isDragging = true;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  window.addEventListener("mousedown", handleMouseDown);

  renderer.render(camera, getScreen(canvas));
};

main();
