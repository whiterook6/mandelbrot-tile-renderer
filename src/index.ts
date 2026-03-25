import { panCamera, zoomCamera, type Camera } from "./camera";
import { fitCanvasToLayout, getCanvas, getScreen } from "./canvas";
import { Renderer } from "./renderer";
import { Status } from "./status";
import type { Screen } from "./tile";

const getInitialCamera = (fallback: Camera) => {
  const fromLocalStorage = localStorage.getItem("camera");
  try {
    if (fromLocalStorage){
      return JSON.parse(fromLocalStorage);
    }
  } catch (error) {
    console.error("Error parsing camera from localStorage", error);
    localStorage.setItem("camera", JSON.stringify(fallback));
  }
  return fallback;
}

const main = () => {
  const { canvas, context } = getCanvas("tile-canvas");
  const renderer = new Renderer(context);

  const zoomToMandelbrot = (canvas: HTMLCanvasElement): Camera => {
    return {
      worldX: -0.7436438870371587,
      worldY: 0,
      zoom: canvas.width / 3.5,
      generation: 0,
    };
  };

  fitCanvasToLayout(canvas);
  const devicePixelRatio = window.devicePixelRatio || 1;

  let camera: Camera = getInitialCamera(zoomToMandelbrot(canvas));
  {
    const screen: Screen = getScreen(canvas);
    Status.setView(screen, camera);
  }
  const handleWheel = (event: WheelEvent) => {
    const screen: Screen = getScreen(canvas);
    camera = zoomCamera(camera, screen, {
      cursorX: event.clientX * devicePixelRatio,
      cursorY: event.clientY * devicePixelRatio,
      deltaY: event.deltaY,
    });
    localStorage.setItem("camera", JSON.stringify(camera));
    Status.setView(screen, camera);
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

    localStorage.setItem("camera", JSON.stringify(camera));
    Status.setView(screen, camera);
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

  window.addEventListener("keydown", (event) => {
    const screen: Screen = getScreen(canvas);
    switch (event.key) {
      case "Escape":
        // reset the camera to the initial position
        camera = zoomToMandelbrot(canvas);
        localStorage.setItem("camera", JSON.stringify(camera));
        Status.setView(screen, camera);
        renderer.render(camera, screen, true);
        break;
      case "+":
        // zoom in around the center of the screen
        camera = {
          ...camera,
          zoom: camera.zoom * 2,
        };
        localStorage.setItem("camera", JSON.stringify(camera));
        Status.setView(screen, camera);
        renderer.render(camera, screen);
        break;
      case "-":
        // zoom out around the center of the screen
        camera = {
          ...camera,
          zoom: camera.zoom / 2,
        };
        localStorage.setItem("camera", JSON.stringify(camera));
        Status.setView(screen, camera);
        renderer.render(camera, screen);
        break;
    }
  });

  renderer.render(camera, getScreen(canvas), true);
};

main();
