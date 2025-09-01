import { Router } from "express";
import * as adminController from "controllers/admin.controller";

const adminRouter = Router();

/**
 * @swagger
 * /admin/test-dream-downloads:
 *  get:
 *    tags:
 *      - admin
 *    summary: Test dream file downloads
 *    description: Tests accessibility of dream files and returns detailed results
 *    parameters:
 *      - name: limit
 *        in: query
 *        description: Number of dreams to test (default 100)
 *        required: false
 *        schema:
 *          type: integer
 *      - name: concurrency
 *        in: query
 *        description: Number of concurrent requests (default 25)
 *        required: false
 *        schema:
 *          type: integer
 *    responses:
 *      '200':
 *        description: Test results with statistics and failures
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                success:
 *                  type: boolean
 *                data:
 *                  type: object
 *                  properties:
 *                    stats:
 *                      type: object
 *                    failures:
 *                      type: array
 *                    timestamp:
 *                      type: string
 *      '500':
 *        description: Internal server error

 */
adminRouter.get(
  "/test-dream-downloads",
  adminController.handleTestDreamDownloads,
);

/**
 * @swagger
 * /admin/download-failures:
 *  get:
 *    tags:
 *      - admin
 *    summary: Download failures as JSON file
 *    description: Runs dream download test and returns failures as downloadable JSON
 *    parameters:
 *      - name: limit
 *        in: query
 *        description: Number of dreams to test (default 100)
 *        required: false
 *        schema:
 *          type: integer
 *      - name: concurrency
 *        in: query
 *        description: Number of concurrent requests (default 25)
 *        required: false
 *        schema:
 *          type: integer
 *    responses:
 *      '200':
 *        description: JSON file with failed downloads
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  id:
 *                    type: number
 *                  uuid:
 *                    type: string
 *                  fileType:
 *                    type: string
 *                  fileUrl:
 *                    type: string
 *                  error:
 *                    type: string
 *      '500':
 *        description: Internal server error

 */
adminRouter.get("/download-failures", adminController.handleDownloadFailures);

export default adminRouter;
