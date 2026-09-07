export type PracaPedagio = {
  nome: string;
  latitude: number;
  longitude: number;
  valor: number;
  atualizadoEm: string;
};

/**
 * Base interna de tarifas para automóveis (categoria de passeio).
 * Atualizada em 06/09/2026 a partir de dados abertos geográficos de praças
 * de pedágio. Não consulta serviços pagos durante o cálculo.
 *
 * A tarifa pode mudar pelas concessionárias; por isso a tela sempre exibe
 * que é uma estimativa e lista as praças usadas no total.
 */
export const pracasPedagioSp: PracaPedagio[] = [
  { nome: 'Boituva', latitude: -23.313482, longitude: -47.643544, valor: 14.5, atualizadoEm: '01/07/2026' },
  { nome: 'Porto Feliz', latitude: -23.227598, longitude: -47.56258, valor: 11.5, atualizadoEm: '01/07/2026' },
  { nome: 'Rafard', latitude: -23.050844, longitude: -47.575366, valor: 7.5, atualizadoEm: '01/07/2026' },
  { nome: 'Itu', latitude: -23.406739, longitude: -47.301584, valor: 13.2, atualizadoEm: '30/03/2026' },
  { nome: 'Salto', latitude: -23.134633, longitude: -47.360672, valor: 5.2, atualizadoEm: '01/07/2026' },
  { nome: 'Indaiatuba', latitude: -23.063217, longitude: -47.154656, valor: 20.3, atualizadoEm: '01/07/2026' },
  { nome: 'Quadra', latitude: -23.245988, longitude: -48.085984, valor: 20.4, atualizadoEm: '01/07/2026' },
  { nome: 'Alambari', latitude: -23.552908, longitude: -47.77783, valor: 12.8, atualizadoEm: '01/07/2026' },
  { nome: 'Buri', latitude: -23.938487, longitude: -48.574777, valor: 16.2, atualizadoEm: '01/07/2026' },
  { nome: 'Itatinga', latitude: -23.08245, longitude: -48.514829, valor: 20.4, atualizadoEm: '01/07/2026' },
  { nome: 'Botucatu', latitude: -22.838002, longitude: -48.516631, valor: 8, atualizadoEm: '01/07/2026' },
  { nome: 'Areiópolis', latitude: -22.675814, longitude: -48.688763, valor: 9, atualizadoEm: '01/07/2026' },
  { nome: 'Conchas', latitude: -23.031184, longitude: -47.984619, valor: 10.2, atualizadoEm: '01/07/2026' },
  { nome: 'Anhembi', latitude: -22.947935, longitude: -48.285782, valor: 11.5, atualizadoEm: '01/07/2026' },
  { nome: 'Rio Claro', latitude: -22.54426, longitude: -47.582327, valor: 9.2, atualizadoEm: '01/07/2026' },
  { nome: 'Rio das Pedras', latitude: -22.845399, longitude: -47.560192, valor: 11.5, atualizadoEm: '01/07/2026' },
  { nome: 'Rio das Pedras (SP-304)', latitude: -22.910408, longitude: -47.708713, valor: 14.9, atualizadoEm: '01/07/2026' },
  { nome: 'Piracicaba', latitude: -22.606488, longitude: -47.714751, valor: 7.4, atualizadoEm: '13/06/2026' },
  { nome: 'São Pedro I', latitude: -22.648128, longitude: -47.807176, valor: 8.3, atualizadoEm: '13/06/2026' },
  { nome: 'São Pedro II', latitude: -22.564836, longitude: -48.06201, valor: 8.6, atualizadoEm: '13/06/2026' },
  { nome: 'Torrinha', latitude: -22.405122, longitude: -48.261669, valor: 7.6, atualizadoEm: '13/06/2026' },
  { nome: 'Limeira', latitude: -22.510081, longitude: -47.39767, valor: 9.7, atualizadoEm: '01/07/2026' },
  { nome: 'Limeira (sentido norte)', latitude: -22.55589, longitude: -47.460732, valor: 9.7, atualizadoEm: '01/07/2026' },
  { nome: 'Limeira municipal', latitude: -22.5304, longitude: -47.433763, valor: 2.85, atualizadoEm: '01/07/2026' },
  { nome: 'Iracemápolis', latitude: -22.654389, longitude: -47.518916, valor: 9.1, atualizadoEm: '01/07/2026' },
  { nome: 'Nova Odessa', latitude: -22.770664, longitude: -47.238717, valor: 12.8, atualizadoEm: '01/07/2026' },
  { nome: 'Sumaré', latitude: -22.857828, longitude: -47.300599, valor: 12.8, atualizadoEm: '01/07/2026' },
  { nome: 'Monte Mor', latitude: -22.978053, longitude: -47.351415, valor: 10.6, atualizadoEm: '01/07/2026' },
  { nome: 'Jaguariúna', latitude: -22.771126, longitude: -47.021801, valor: 8.8, atualizadoEm: '01/07/2026' },
  { nome: 'Paulínia A', latitude: -22.690102, longitude: -47.154927, valor: 12.6, atualizadoEm: '01/07/2026' },
  { nome: 'Paulínia B', latitude: -22.713051, longitude: -47.142678, valor: 17.5, atualizadoEm: '01/07/2026' },
  { nome: 'Valinhos', latitude: -23.020334, longitude: -47.018708, valor: 14.3, atualizadoEm: '01/07/2026' },
  { nome: 'Vinhedo', latitude: -23.056723, longitude: -47.041313, valor: 8.4, atualizadoEm: '25/10/2023' },
  { nome: 'Itupeva (Bandeirantes)', latitude: -23.057588, longitude: -47.044231, valor: 14.3, atualizadoEm: '01/07/2026' },
  { nome: 'Itupeva (SP-300)', latitude: -23.235264, longitude: -47.042688, valor: 11.1, atualizadoEm: '01/07/2026' },
  { nome: 'Louveira', latitude: -23.055159, longitude: -46.894267, valor: 4.1, atualizadoEm: '01/07/2026' },
  { nome: 'Jundiaí', latitude: -23.076897, longitude: -46.841438, valor: 6.4, atualizadoEm: '01/07/2026' },
  { nome: 'Itatiba', latitude: -22.953969, longitude: -46.859967, valor: 16.1, atualizadoEm: '01/07/2026' },
  { nome: 'Campo Limpo Paulista', latitude: -23.322886, longitude: -46.823238, valor: 14.5, atualizadoEm: '01/07/2026' },
  { nome: 'Sorocaba / interior', latitude: -23.411478, longitude: -47.341825, valor: 7.5, atualizadoEm: '30/03/2026' },
  { nome: 'Morro do Alto I', latitude: -23.434727, longitude: -47.938078, valor: 16.7, atualizadoEm: '01/07/2026' },
  { nome: 'Morro do Alto II', latitude: -23.470872, longitude: -47.968002, valor: 16.7, atualizadoEm: '01/07/2026' },
  { nome: 'Gramadão', latitude: -23.873659, longitude: -48.242244, valor: 15, atualizadoEm: '01/07/2026' },
  { nome: 'Barueri', latitude: -23.510198, longitude: -46.81727, valor: 4.2, atualizadoEm: '30/03/2026' },
  { nome: 'Itapevi', latitude: -23.518069, longitude: -46.940818, valor: 9.8, atualizadoEm: '30/03/2026' },
  { nome: 'Rodoanel Oeste', latitude: -23.508114, longitude: -46.823238, valor: 3.65, atualizadoEm: '01/07/2026' },
  { nome: 'Mogi Mirim', latitude: -22.456762, longitude: -46.902196, valor: 11.7, atualizadoEm: '01/07/2026' },
];

