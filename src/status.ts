import type { Camera } from "./camera";
import type { Screen } from "./tile";

export const Status = {
  statusBar: document.getElementById("status-bar"),
  viewX: document.getElementById("view-x"),
  viewY: document.getElementById("view-y"),
  viewZoom: document.getElementById("view-zoom"),
  resetView: document.getElementById("reset-view"),
    
  setView: (screen: Screen, camera: Camera) => {
    Status.viewX!.textContent = `${camera.worldX}`;
    Status.viewY!.textContent = `${camera.worldY}`;
    Status.viewZoom!.textContent = `${screen.width / camera.zoom}`;
  },
}