import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as authController from '../controllers/authController';
import * as clinicaController from '../controllers/clinicaController';
import * as equipamentoController from '../controllers/equipamentoController';
import * as locacaoController from '../controllers/locacaoController';
import * as colaboradorController from '../controllers/colaboradorController';

const router = Router();

// Público
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.me);

// Protegidas
router.use(authMiddleware);

// Clínicas
router.get('/clinicas', clinicaController.index);
router.get('/clinicas/:id', clinicaController.show);
router.post('/clinicas', clinicaController.create);
router.put('/clinicas/:id', clinicaController.update);
router.delete('/clinicas/:id', clinicaController.remove);

// Equipamentos
router.get('/equipamentos', equipamentoController.index);
router.get('/equipamentos/:id', equipamentoController.show);
router.post('/equipamentos', equipamentoController.create);
router.put('/equipamentos/:id', equipamentoController.update);
router.delete('/equipamentos/:id', equipamentoController.remove);

// Colaboradores (Técnicos e Motoristas)
router.get('/colaboradores', colaboradorController.listar);
router.post('/colaboradores', colaboradorController.criar);
router.put('/colaboradores/:id', colaboradorController.atualizar);
router.delete('/colaboradores/:id', colaboradorController.deletar);

// Locações / Agenda
router.get('/locacoes', locacaoController.index);
router.get('/locacoes/:id', locacaoController.show);
router.post('/locacoes', locacaoController.create);
router.put('/locacoes/:id', locacaoController.update);
router.delete('/locacoes/:id', locacaoController.remove);
router.post('/locacoes/verificar-disponibilidade', locacaoController.verificarDisponibilidadeController);

export default router;
