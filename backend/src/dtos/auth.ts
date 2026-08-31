import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().min(3).max(30),
  senha: z.string().min(3),
});

export type LoginInput = z.infer<typeof loginSchema>;
