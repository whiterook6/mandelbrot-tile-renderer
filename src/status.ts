import type { Camera } from "./camera";
import type { Screen } from "./tile";

export const Status = {
  statusBar: document.getElementById("status-bar"),
  viewX: document.getElementById("view-x"),
  viewY: document.getElementById("view-y"),
  viewZoom: document.getElementById("view-zoom"),
  viewRotation: document.getElementById("view-rotation"),
  resetView: document.getElementById("reset-view"),
  takeSnapshot: document.getElementById("take-snapshot"),
  progress: document.getElementById("queue-count"),

  setView: (camera: Camera, screen: Screen) => {
    Status.viewX!.textContent = `${camera.worldX.toString()}`;
    Status.viewY!.textContent = `${camera.worldY.toString()}`;
    Status.viewZoom!.textContent = `${camera.zoom.div(screen.width).toString()}`;
    const deg = Math.round((camera.rotation * 180) / Math.PI);
    Status.viewRotation!.textContent = `${deg}°`;
  },
};
