import { CameraController, type Camera } from "./camera";
import type { Screen } from "./tile";

/**
 * Affine map from frozen-screen pixel (u, v) to live-screen pixel, using the same
 * world projection as CameraController: world = unproject(frozen, u,v), then
 * screen = project(live, world). Canvas setTransform(a,b,c,d,e,f) sends (u,v) to
 * (a*u + c*v + e, b*u + d*v + f).
 */
export function getCompositeTransform(
  frozen: Camera,
  live: Camera,
  screen: Screen,
): { a: number; b: number; c: number; d: number; e: number; f: number } {
  const frozenCtrl = new CameraController(frozen);
  const liveCtrl = new CameraController(live);

  const mapFrozenToLive = (screenX: number, screenY: number) => {
    const world = frozenCtrl.getWorldPosition(screen, { screenX, screenY });
    const s = liveCtrl.getScreenPosition(screen, world);
    return { x: s.screenX, y: s.screenY };
  };

  const p0 = mapFrozenToLive(0, 0);
  const p1 = mapFrozenToLive(1, 0);
  const p2 = mapFrozenToLive(0, 1);

  return {
    a: p1.x - p0.x,
    b: p1.y - p0.y,
    c: p2.x - p0.x,
    d: p2.y - p0.y,
    e: p0.x,
    f: p0.y,
  };
}
