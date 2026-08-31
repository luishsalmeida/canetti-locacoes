import { Router } from 'express';
import * as colaboradorController from '../controllers/colaboradorController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', colaboradorController.listar);
router.post('/', colaboradorController.criar);
router.put('/:id', colaboradorController.atualizar);
router.delete('/:id', colaboradorController.deletar);

export default router;
