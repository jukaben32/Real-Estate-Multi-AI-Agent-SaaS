import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authService } from "./auth.service";
import { registerAgentSchema, loginSchema, registerClientSchema } from "./auth.schema";

export const authController = {
  registerAgent: asyncHandler(async (req: Request, res: Response) => {
    const data = registerAgentSchema.parse(req.body);
    const result = await authService.registerAgent(data);
    res.status(201).json({ success: true, data: result });
  }),

  loginAgent: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.loginAgent(email, password);
    res.json({ success: true, data: result });
  }),

  registerClient: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = registerClientSchema.parse(req.body);
    const result = await authService.registerClient(email, password);
    res.status(201).json({ success: true, data: result });
  }),

  loginClient: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.loginClient(email, password);
    res.json({ success: true, data: result });
  }),
};
