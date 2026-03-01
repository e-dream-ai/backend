import { Router, Request, Response } from "express";
import httpStatus from "http-status";
import env from "shared/env";
import { takeAndUploadHeapSnapshot } from "utils/heap-snapshot.util";
import { jsonResponse } from "utils/responses.util";

const heapSnapshotRouter = Router();

heapSnapshotRouter.post("/", async (req: Request, res: Response) => {
  if (!env.HEAP_SNAPSHOT_API_KEY) {
    return res
      .status(httpStatus.SERVICE_UNAVAILABLE)
      .json(
        jsonResponse({
          success: false,
          message: "Heap snapshot not configured",
        }),
      );
  }

  const apiKey = req.headers["x-snapshot-key"];
  if (!apiKey || apiKey !== env.HEAP_SNAPSHOT_API_KEY) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .json(jsonResponse({ success: false, message: "Unauthorized" }));
  }

  try {
    const r2Key = await takeAndUploadHeapSnapshot("MANUAL");
    return res
      .status(httpStatus.OK)
      .json(
        jsonResponse({
          success: true,
          message: "Snapshot uploaded",
          data: { r2Key },
        }),
      );
  } catch (err) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(
        jsonResponse({ success: false, message: "Failed to take snapshot" }),
      );
  }
});

export default heapSnapshotRouter;
