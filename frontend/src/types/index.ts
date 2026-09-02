export interface Usuario {
  id: number;
  nome: string;
  login: string;
  perfil: 'ADMIN' | 'GERENTE' | 'OPERADOR' | 'CONSULTA' | 'COLABORADOR';
  colaboradorId?: number | null;
  colaboradorFuncao?: 'TECNICO' | 'MOTORISTA' | null;
}

export interface Colaborador {
  id: number;
  nome: string;
  funcao: 'TECNICO' | 'MOTORISTA';
  telefone?: string | null;
  ativo: boolean;
  usuarioAcesso?: {
    id: number;
    login: string;
    ativo: boolean;
  } | null;
}

export interface Clinica {
  id: number;
  codigo?: number | null;
  razaoSocial: string;
  nomeFantasia?: string | null;
  tipoPessoa: 'FISICA' | 'JURIDICA';
  cnpjCpf?: string | null;
  ie?: string | null;
  email?: string | null;
  telefone?: string | null;
  celular?: string | null;
  contato?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  regiao?: string | null;
  observacoes?: string | null;
  status: 'ATIVA' | 'BLOQUEADA' | 'INADIMPLENTE';
  limiteCredito: number;
  saldoCredor: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CategoriaEquipamento {
  id: number;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
}

export interface Equipamento {
  id: number;
  codigo?: number | null;
  descricao: string;
  modelo?: string | null;
  marca?: string | null;
  numeroSerie?: string | null;
  patrimonio?: string | null;
  categoriaId: number;
  categoria?: CategoriaEquipamento;
  unidade: string;
  valorDiaria: number;
  tiposDisparo?: string[];
  valorSemanal: number;
  valorMensal: number;
  status: 'DISPONIVEL' | 'LOCADO' | 'MANUTENCAO' | 'INATIVO';
  observacoes?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ItemLocacao {
  id: number;
  locacaoId: number;
  equipamentoId: number;
  equipamento: Equipamento;
  valorDiaria: number;
  quantidade: number;
  valorTotal: number;
  valoresDisparo?: Record<string, number> | null;
  observacoes?: string | null;
}

export interface Pagamento {
  id?: number;
  locacaoId?: number;
  forma: 'EMPRESA' | 'DR';
  valor: number;
  status: 'PENDENTE' | 'RECEBIDO' | 'VENCIDO' | 'CANCELADO';
  vencimento?: string | null;
  recebidoEm?: string | null;
  observacoes?: string | null;
}

export type StatusLocacao = 'AGENDADA' | 'CONFIRMADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA' | 'NO_SHOW';

export interface Locacao {
  id: number;
  codigo?: number | null;
  clinicaId: number;
  clinica: Clinica;
  dataInicio: string;
  horaInicio?: string | null;
  dataFim: string;
  horaFim?: string | null;
  enderecoLocacao?: string | null;
  cidadeLocacao?: string | null;
  tecnicoId?: number | null;
  tecnico?: Colaborador | null;
  motoristaId?: number | null;
  motorista?: Colaborador | null;
  valorTotal: number;
  valorDesconto: number;
  valorFinal: number;
  status: StatusLocacao;
  observacoes?: string | null;
  criadoPorId: number;
  criadoPor: Usuario;
  criadoEm: string;
  atualizadoEm: string;
  itens: ItemLocacao[];
  pagamentos?: Pagamento[];
}

export interface AuthResponse {
  usuario: Usuario;
  token: string;
}
