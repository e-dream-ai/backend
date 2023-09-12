import type { Request, Response } from "express";
import httpStatus from "http-status";

/**
 * Handles the signup
 *
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 *
 */
export const handleSignUp = async (req: Request, res: Response) => {
  return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(req);
};

/**
 * Handles the login
 *
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 *
 */
export const handleLogin = async (req: Request, res: Response) => {
  return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(req);
};

/**
 * Handles the logout
 *
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 *
 */
export const handleLogout = async (req: Request, res: Response) => {
  return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(req);
};

/**
 * Handles the refresh
 *
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 *
 */
export const handleRefresh = async (req: Request, res: Response) => {
  return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(req);
};
