import { Router } from 'express';
import { authMiddleware, requireProfile } from '../middleware/auth';
import * as authController from '../controllers/authController';
import * as clinicaController from '../controllers/clinicaController';
import * as equipamentoController from '../controllers/equipamentoController';
import * as locacaoController from '../controllers/locacaoController';
import * as colaboradorController from '../controllers/colaboradorController';
import { loginRateLimit } from '../middleware/loginRateLimit';
import { reportSyncAuth } from '../middleware/reportSyncAuth';
import * as usuarioController from '../controllers/usuarioController';

const router = Router();

// Público
router.post('/auth/login', loginRateLimit, authController.login);
router.get('/auth/me', authMiddleware, authController.me);

// Endpoint used only by the local Excel synchronizer. It has its own secret,
// so a long-lived user login token never needs to be stored on the computer.
router.get('/relatorios/locacoes-concluidas', reportSyncAuth, locacaoController.exportarConcluidas);

// Protegidas
router.use(authMiddleware);

const podeConsultar = requireProfile('ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA');
const podeVerAgenda = requireProfile('ADMIN', 'GERENTE', 'OPERADOR', 'CONSULTA', 'COLABORADOR');
const podeOperar = requireProfile('ADMIN', 'GERENTE', 'OPERADOR');
const podeGerenciarCadastros = requireProfile('ADMIN', 'GERENTE');
const somenteAdmin = requireProfile('ADMIN');

// Clínicas
router.get('/clinicas', podeConsultar, clinicaController.index);
router.get('/clinicas/:id', podeConsultar, clinicaController.show);
router.post('/clinicas', podeGerenciarCadastros, clinicaController.create);
router.put('/clinicas/:id', podeGerenciarCadastros, clinicaController.update);
router.delete('/clinicas/:id', somenteAdmin, clinicaController.remove);

// Equipamentos
router.get('/equipamentos', podeConsultar, equipamentoController.index);
router.get('/equipamentos/:id', podeConsultar, equipamentoController.show);
router.post('/equipamentos', podeGerenciarCadastros, equipamentoController.create);
router.put('/equipamentos/:id', podeGerenciarCadastros, equipamentoController.update);
router.delete('/equipamentos/:id', somenteAdmin, equipamentoController.remove);

// Colaboradores (Técnicos e Motoristas)
router.get('/colaboradores', podeConsultar, colaboradorController.listar);
router.post('/colaboradores', podeGerenciarCadastros, colaboradorController.criar);
router.put('/colaboradores/:id', podeGerenciarCadastros, colaboradorController.atualizar);
router.delete('/colaboradores/:id', somenteAdmin, colaboradorController.deletar);

// Acessos individuais de técnicos e motoristas
router.post('/usuarios/colaborador', somenteAdmin, usuarioController.criarAcessoColaborador);

// Locações / Agenda
router.get('/locacoes', podeVerAgenda, locacaoController.index);
router.get('/locacoes/:id', podeVerAgenda, locacaoController.show);
router.post('/locacoes', podeOperar, locacaoController.create);
router.put('/locacoes/:id', podeOperar, locacaoController.update);
router.delete('/locacoes/:id', somenteAdmin, locacaoController.remove);
router.post('/locacoes/verificar-disponibilidade', podeOperar, locacaoController.verificarDisponibilidadeController);

export default router;
