import { panView, zoomView, type CameraView } from "./camera";
import { fitCanvasToLayout, getCanvas, getScreen } from "./canvas";
import { Renderer } from "./renderer";
import type { Screen } from "./tile";

const main = () => {
  const { canvas, context } = getCanvas("tile-canvas");
  const renderer = new Renderer(context);

  const zoomToMandelbrot = (canvas: HTMLCanvasElement): CameraView => {
    return {
      worldX: -0.7436438870371587,
      worldY: 0,
      zoom: canvas.width / 3.5,
    };
  };

  let view: CameraView = {
    worldX: 0,
    worldY: 0,
    zoom: 1,
  };

  const onBufferResize = () => {
    const screen: Screen = getScreen(canvas);
    renderer.resize(screen);
    renderer.setLiveView(view);
    renderer.scheduleTileRender(view, screen, true);
  };

  fitCanvasToLayout(canvas, onBufferResize);
  view = zoomToMandelbrot(canvas);
  const devicePixelRatio = window.devicePixelRatio || 1;

  const handleWheel = (event: WheelEvent) => {
    const screen: Screen = getScreen(canvas);
    view = zoomView(view, screen, {
      cursorX: event.clientX * devicePixelRatio,
      cursorY: event.clientY * devicePixelRatio,
      deltaY: event.deltaY,
    });

    renderer.setLiveView(view);
    renderer.scheduleTileRender(view, screen);
  };
  window.addEventListener("wheel", handleWheel);

  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging) {
      return;
    }

    const screen: Screen = getScreen(canvas);
    view = panView(view, {
      movementX: event.movementX * devicePixelRatio,
      movementY: event.movementY * devicePixelRatio,
    });

    renderer.setLiveView(view);
    renderer.scheduleTileRender(view, screen);
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

  window.addEventListener("keydown", (event) => {
    const screen: Screen = getScreen(canvas);
    switch (event.key) {
      case "Escape":
        view = zoomToMandelbrot(canvas);
        renderer.setLiveView(view);
        renderer.scheduleTileRender(view, screen, true);
        break;
      case "+":
        view = {
          ...view,
          zoom: view.zoom * 2,
        };
        renderer.setLiveView(view);
        renderer.scheduleTileRender(view, screen);
        break;
      case "-":
        view = {
          ...view,
          zoom: view.zoom / 2,
        };
        renderer.setLiveView(view);
        renderer.scheduleTileRender(view, screen);
        break;
    }
  });

  const screen = getScreen(canvas);
  renderer.resize(screen);
  renderer.setLiveView(view);
  renderer.scheduleTileRender(view, screen, true);
};

main();
