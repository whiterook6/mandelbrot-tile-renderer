import {
  panCamera,
  twistCamera,
  zoomCamera,
  type Camera,
  loadCamera,
  saveCamera,
} from "./camera";
import { fitCanvasToLayout, getCanvas, getScreen } from "./canvas";
import { Renderer } from "./renderer";
import { Status } from "./status";
import type { Screen } from "./tile";

const main = () => {
  const { canvas, context } = getCanvas("tile-canvas");
  const renderer = new Renderer(context);

  const canvasCoordsFromEvent = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) * canvas.width) / rect.width;
    const y = ((event.clientY - rect.top) * canvas.height) / rect.height;
    return { x, y };
  };

  const movementInCanvasPixels = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      movementX: event.movementX * scaleX,
      movementY: event.movementY * scaleY,
    };
  };

  const setView = (camera: Camera) => {
    const screen: Screen = getScreen(canvas);
    Status.setView(camera, screen);
    saveCamera(camera);
    renderer.render(camera, screen);
  };

  const zoomToMandelbrot = (canvasEl: HTMLCanvasElement): Camera => {
    return {
      worldX: -0.7436438870371587,
      worldY: 0,
      zoom: canvasEl.width / 3.5,
      rotation: 0,
      generation: 0,
    };
  };

  fitCanvasToLayout(canvas);
  let camera: Camera = loadCamera(zoomToMandelbrot(canvas));

  Status.resetView!.addEventListener("click", () => {
    camera = zoomToMandelbrot(canvas);
    setView(camera);
  });

  Status.takeSnapshot!.addEventListener("click", () => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "snapshot.png";
        a.click();
      }
    });
  })

  const handleWheel = (event: WheelEvent) => {
    const screen: Screen = getScreen(canvas);
    const { x: cursorX, y: cursorY } = canvasCoordsFromEvent(event);
    camera = zoomCamera(camera, screen, {
      cursorX,
      cursorY,
      deltaY: event.deltaY,
    });
    setView(camera);
  };
  window.addEventListener("wheel", handleWheel);

  let isPanning = false;
  let isTwisting = false;
  let twistVPrev = { x: 0, y: 0 };

  const handlePanMouseMove = (event: MouseEvent) => {
    if (!isPanning) {
      return;
    }
    const { movementX, movementY } = movementInCanvasPixels(event);
    camera = panCamera(camera, { movementX, movementY });
    setView(camera);
  };

  const handlePanMouseUp = () => {
    isPanning = false;
    window.removeEventListener("mousemove", handlePanMouseMove);
    window.removeEventListener("mouseup", handlePanMouseUp);
  };

  const handlePanMouseDown = (event: MouseEvent) => {
    if (event.button !== 0 || isTwisting) {
      return;
    }
    event.preventDefault();
    isPanning = true;
    window.addEventListener("mousemove", handlePanMouseMove);
    window.addEventListener("mouseup", handlePanMouseUp);
  };

  const handleTwistMouseMove = (event: MouseEvent) => {
    if (!isTwisting) {
      return;
    }
    const screen: Screen = getScreen(canvas);
    const { x, y } = canvasCoordsFromEvent(event);
    const vCurr = {
      x: x - screen.width / 2,
      y: y - screen.height / 2,
    };
    camera = twistCamera(camera, twistVPrev, vCurr);
    setView(camera);
    twistVPrev = vCurr;
  };

  const handleTwistMouseUp = () => {
    isTwisting = false;
    window.removeEventListener("mousemove", handleTwistMouseMove);
    window.removeEventListener("mouseup", handleTwistMouseUp);
  };

  const handleTwistMouseDown = (event: MouseEvent) => {
    if (event.button !== 2 || isPanning) {
      return;
    }
    event.preventDefault();
    isTwisting = true;
    const screen: Screen = getScreen(canvas);
    const { x, y } = canvasCoordsFromEvent(event);
    twistVPrev = {
      x: x - screen.width / 2,
      y: y - screen.height / 2,
    };
    window.addEventListener("mousemove", handleTwistMouseMove);
    window.addEventListener("mouseup", handleTwistMouseUp);
  };

  canvas.addEventListener("mousedown", handlePanMouseDown);
  canvas.addEventListener("mousedown", handleTwistMouseDown);
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  window.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "Escape":
        camera = zoomToMandelbrot(canvas);
        setView(camera);
        break;
      case "+":
        camera = {
          ...camera,
          zoom: camera.zoom * 2,
          generation: camera.generation + 1,
        };
        setView(camera);
        break;
      case "-":
        camera = {
          ...camera,
          zoom: camera.zoom / 2,
          generation: camera.generation + 1,
        };
        setView(camera);
        break;
    }
  });

  setView(camera);
};

main();
