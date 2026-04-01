import { CameraController, type Camera } from "./camera";
import { GradientController } from "./gradient";
import type { RenderedTileMessage, RenderTileMessage } from "./messages";
import { Status } from "./status";
import type { Screen } from "./tile";
import { getCompositeTransform } from "./viewAffine";

const RENDER_DEBOUNCE_MS = 125;

const iterationsToImageData = (
  iterations: Float32Array,
  maxIterations: number,
  width: number,
  height: number,
): ImageData => {
  const imageData = new ImageData(width, height);
  const out = imageData.data;
  const n = width * height;
  for (let i = 0; i < n; i++) {
    const iter = iterations[i]!;
    const o = i * 4;
    const inside = iter >= maxIterations;
    const pixel = GradientController.currentGradient.fn(inside, iter, maxIterations);
    out[o] = pixel[0];
    out[o + 1] = pixel[1];
    out[o + 2] = pixel[2];
    out[o + 3] = pixel[3];
  }
  return imageData;
};

const shuffleTileIndices = (count: number): number[] => {
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = indices[i];
    indices[i] = indices[j]!;
    indices[j] = t!;
  }
  return indices;
};

export class Renderer {
  private context: CanvasRenderingContext2D;
  private workers: Worker[];
  private workQueue: Array<RenderTileMessage>;
  private camera: Camera = CameraController.initialCamera;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCamera: Camera | null = null;
  private pendingScreen: Screen | null = null;
  private maxWorkerCount: number = Math.max(
    1,
    navigator.hardwareConcurrency - 1,
  );
  /** Generation of `camera` baked into `workQueue`; null until first queue build. */
  private queuedForGeneration: number | null = null;
  private workerInFlight: boolean[];

  private backing: OffscreenCanvas | null = null;
  private backingCtx: OffscreenCanvasRenderingContext2D | null = null;
  /** Camera used for the RGB currently in `backing` (updated on each dispatch). */
  private frozenCamera: Camera = { ...CameraController.initialCamera };
  private compositeScheduled = false;
  private hasDispatched = false;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
    this.workerInFlight = new Array(this.maxWorkerCount).fill(false);
    this.workers = Array.from({ length: this.maxWorkerCount }, (_, workerIndex) => {
      const worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      worker.addEventListener("error", (event) => {
        console.error(
          "tile worker error",
          event.message,
          event.filename,
          event.lineno,
        );
      });
      worker.addEventListener("messageerror", (event) => {
        console.error(
          "tile worker message could not be deserialized",
          event.data,
        );
      });

      worker.addEventListener(
        "message",
        (event: MessageEvent<RenderedTileMessage>) => {
          this.onWorkerMessage(workerIndex, event.data);
        },
      );
      return worker;
    });
    this.workQueue = [];
  }

  private postJobToWorker(workerIndex: number, message: RenderTileMessage) {
    this.workerInFlight[workerIndex] = true;
    this.workers[workerIndex]!.postMessage(message);
  }

  private onWorkerMessage(workerIndex: number, message: RenderedTileMessage) {
    this.workerInFlight[workerIndex] = false;
    this.receiveTile(message);
    const nextMessage = this.dequeueTile();
    if (nextMessage !== undefined) {
      this.postJobToWorker(workerIndex, nextMessage);
    }
  }

  private rebuildWorkQueue(camera: Camera, screen: Screen) {
    const tileCount = screen.rowCount * screen.columnCount;
    Status.progress!.textContent = `${tileCount}`;
    this.workQueue = shuffleTileIndices(tileCount).map((index) => ({
      type: "requestTile",
      camera,
      screen,
      tileIndex: index,
    }));
    this.camera = { ...camera };
    this.queuedForGeneration = camera.generation;
  }

  private seedIdleWorkers() {
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workerInFlight[i]) {
        const nextMessage = this.dequeueTile();
        if (nextMessage !== undefined) {
          this.postJobToWorker(i, nextMessage);
        }
      }
    }
  }

  private ensureBacking(screen: Screen) {
    if (this.backing === null || this.backingCtx === null) {
      this.backing = new OffscreenCanvas(screen.width, screen.height);
      const ctx = this.backing.getContext("2d", { alpha: false });
      if (!ctx) {
        throw new Error("2D backing context unavailable");
      }
      this.backingCtx = ctx;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, screen.width, screen.height);
    }
    if (
      this.backing.width !== screen.width ||
      this.backing.height !== screen.height
    ) {
      this.backing.width = screen.width;
      this.backing.height = screen.height;
      const live = this.pendingCamera ?? this.camera;
      this.frozenCamera = { ...live };
      this.clearBacking();
    }
  }

  private clearBacking() {
    if (this.backing === null || this.backingCtx === null) {
      return;
    }
    const { width, height } = this.backing;
    this.backingCtx.fillStyle = "#000000";
    this.backingCtx.fillRect(0, 0, width, height);
  }

  private scheduleComposite() {
    if (this.compositeScheduled) {
      return;
    }
    this.compositeScheduled = true;
    requestAnimationFrame(() => {
      this.compositeScheduled = false;
      this.composite();
    });
  }

  private composite() {
    const live = this.pendingCamera ?? this.camera;
    const screen = this.pendingScreen;
    if (screen === null || this.backing === null || this.backingCtx === null) {
      return;
    }

    const ctx = this.context;
    const t = getCompositeTransform(this.frozenCamera, live, screen);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
    ctx.drawImage(this.backing, 0, 0);
    ctx.restore();
  }

  public rerender = () => {
    this.dispatchRender();
  };

  public render = (camera: Camera, screen: Screen, immediate = false) => {
    this.pendingCamera = camera;
    this.pendingScreen = screen;
    this.ensureBacking(screen);
    if (!this.hasDispatched) {
      this.frozenCamera = { ...camera };
    }

    if (
      this.hasDispatched &&
      camera.generation !== this.queuedForGeneration
    ) {
      this.rebuildWorkQueue(camera, screen);
      this.seedIdleWorkers();
    }

    if (immediate) {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.dispatchRender();
      this.scheduleComposite();
      return;
    }

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.dispatchRender();
      this.scheduleComposite();
    }, RENDER_DEBOUNCE_MS);

    this.scheduleComposite();
  };

  private dispatchRender = () => {
    if (this.pendingCamera === null || this.pendingScreen === null) {
      return;
    }
    const camera = this.pendingCamera;
    const screen = this.pendingScreen;

    this.ensureBacking(screen);
    this.hasDispatched = true;
    this.frozenCamera = { ...camera };
    this.clearBacking();

    this.rebuildWorkQueue(camera, screen);
    this.seedIdleWorkers();

    this.scheduleComposite();
  };

  private dequeueTile = () => {
    const nextMessage = this.workQueue.shift();
    if (nextMessage !== undefined) {
      Status.progress!.textContent = `${this.workQueue.length}`;
      return nextMessage;
    }
    return undefined;
  };

  private receiveTile = (message: RenderedTileMessage) => {
    const { generation, iterations, maxIterations, tile } = message;
    const liveGen = (this.pendingCamera ?? this.camera).generation;
    if (generation !== liveGen) {
      return;
    }
    if (this.backingCtx === null) {
      return;
    }
    const image = iterationsToImageData(
      iterations,
      maxIterations,
      tile.width,
      tile.height,
    );
    this.backingCtx.putImageData(image, tile.x, tile.y);
    this.scheduleComposite();
  };
}
