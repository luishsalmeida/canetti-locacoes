import { Request, Response } from 'express';
import { loginSchema } from '../dtos/auth';
import { loginService } from '../services/authService';

export async function login(req: Request, res: Response) {
  const data = loginSchema.parse(req.body);
  const result = await loginService(data);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  res.json({ usuario: req.user });
}
