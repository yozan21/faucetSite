import type { Response } from "express";

export const sendSuccess = (
  res: Response,
  data: object = {},
  message = "Success",
  statusCode = 200,
) => {
  res.status(statusCode).json({
    success: true,
    message,
    data: {
      data,
    },
  });
};
