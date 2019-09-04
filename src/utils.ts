import { Response } from "express";
const settings = require("../package.json");

export const sendError = (
  res: Response,
  message: string,
  code: number = 404
) => {
  return res
    .status(code)
    .json({ status: "error", version: settings.version, message });
};
