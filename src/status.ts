import type { Camera } from "./camera";
import type { Screen } from "./tile";

export const Status = {
  statusBar: document.getElementById("status-bar"),
  viewX: document.getElementById("view-x"),
  viewY: document.getElementById("view-y"),
  viewZoom: document.getElementById("view-zoom"),
  viewRotation: document.getElementById("view-rotation"),
  resetView: document.getElementById("reset-view"),

  setView: (camera: Camera, screen: Screen) => {
    Status.viewX!.textContent = `${camera.worldX}`;
    Status.viewY!.textContent = `${camera.worldY}`;
    Status.viewZoom!.textContent = `${screen.width / camera.zoom}`;
    const deg = Math.round((camera.rotation * 180) / Math.PI);
    Status.viewRotation!.textContent = `${deg}°`;
  },
};
