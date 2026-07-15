import { NextFunction, Request, Response } from "express";

// Wraps async route handlers so thrown/rejected errors reach the error middleware
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
