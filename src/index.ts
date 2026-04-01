import { CameraController, type Camera } from "./camera";
import { fitCanvasToLayout, getCanvas, getScreen } from "./canvas";
import { Renderer } from "./renderer";
import { Status } from "./status";
import type { Screen } from "./tile";
import { Camera as CameraIcon, createElement, Home } from "lucide";
import { GradientController } from "./gradient";

const setButtonWithIcon = (
  button: HTMLButtonElement,
  icon: Parameters<typeof createElement>[0],
  label: string,
) => {
  button.replaceChildren();
  const svg = createElement(icon, { size: 20, "aria-hidden": "true" });
  svg.classList.add("button-icon");
  const text = document.createElement("span");
  text.textContent = label;
  button.append(svg, text);
};

const main = () => {
  setButtonWithIcon(Status.resetView as HTMLButtonElement, Home, "Home");
  setButtonWithIcon(
    Status.takeSnapshot as HTMLButtonElement,
    CameraIcon,
    "Snapshot",
  );
  const { canvas, context } = getCanvas("tile-canvas");
  fitCanvasToLayout(canvas);

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

  const zoomToMandelbrot = (canvasEl: HTMLCanvasElement): Camera => {
    return {
      worldX: -0.7436438870371587,
      worldY: 0,
      zoom: canvasEl.width / 3.5,
      rotation: 0,
    };
  };
  const cameraController = new CameraController(zoomToMandelbrot(canvas));
  cameraController.loadCamera(); // load camera from localStorage if set

  const renderer = new Renderer(context);
  GradientController.init(renderer);
  const setView = () => {
    const screen: Screen = getScreen(canvas);
    const camera = cameraController.getCamera();
    cameraController.saveCamera();
    Status.setView(camera, screen);
    renderer.render(camera, screen);
  };

  Status.resetView!.addEventListener("click", () => {
    cameraController.setCamera(zoomToMandelbrot(canvas));
    setView();
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
  });

  const handleWheel = (event: WheelEvent) => {
    const screen: Screen = getScreen(canvas);
    const { x: cursorX, y: cursorY } = canvasCoordsFromEvent(event);
    cameraController.zoomCamera(screen, {
      cursorX,
      cursorY,
      deltaY: event.deltaY,
    });
    setView();
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
    cameraController.panCamera({ movementX, movementY });
    setView();
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
    cameraController.twistCamera(twistVPrev, vCurr);
    setView();
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
    const screen: Screen = getScreen(canvas);
    switch (event.key) {
      case "Escape":
        cameraController.setCamera(zoomToMandelbrot(canvas));
        setView();
        break;
      case "+":
        cameraController.zoomCamera(screen, {
          cursorX: screen.width / 2,
          cursorY: screen.height / 2,
          deltaY: 1,
        });
        setView();
        break;
      case "-":
        cameraController.zoomCamera(screen, {
          cursorX: screen.width / 2,
          cursorY: screen.height / 2,
          deltaY: -1,
        });
        setView();
        break;
    }
  });

  setView();
};

main();
