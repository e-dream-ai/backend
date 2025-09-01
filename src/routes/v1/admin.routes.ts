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

/**
 * @swagger
 * /admin/start-test:
 *  get:
 *    tags:
 *      - admin
 *    summary: Start background dream download test
 *    description: Starts a dream download test in the background that won't timeout
 *    parameters:
 *      - name: limit
 *        in: query
 *        description: Number of dreams to test (default no limit)
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
 *        description: Test started successfully
 */
adminRouter.get("/start-test", adminController.handleStartTest);

/**
 * @swagger
 * /admin/test-status:
 *  get:
 *    tags:
 *      - admin
 *    summary: Check background test status
 *    description: Returns current status of background test
 *    responses:
 *      '200':
 *        description: Test status information
 */
adminRouter.get("/test-status", adminController.handleTestStatus);

/**
 * @swagger
 * /admin/download-results:
 *  get:
 *    tags:
 *      - admin
 *    summary: Download test results
 *    description: Downloads the completed test results as JSON file
 *    responses:
 *      '200':
 *        description: JSON file with test results
 */
adminRouter.get("/download-results", adminController.handleDownloadResults);

export default adminRouter;
