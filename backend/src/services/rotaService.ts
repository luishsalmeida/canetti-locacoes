import { pracasPedagioSp, type PracaPedagio } from '../data/pedagiosSp';

type Coordenada = { latitude: number; longitude: number; nome: string };
type CoordenadaRota = [longitude: number, latitude: number];

const cacheCidades = new Map<string, Coordenada>();
let ultimaConsultaNominatim = 0;

function esperar(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function geocodificarCidade(cidade: string): Promise<Coordenada> {
  const chave = cidade.trim().toLocaleLowerCase('pt-BR');
  const emCache = cacheCidades.get(chave);
  if (emCache) return emCache;

  // A instância pública do Nominatim pede no máximo uma consulta por segundo.
  const espera = Math.max(0, 1100 - (Date.now() - ultimaConsultaNominatim));
  if (espera) await esperar(espera);
  ultimaConsultaNominatim = Date.now();

  const consulta = `${cidade.replace(/\s*-\s*/g, ', ')}, Brasil`;
  const resposta = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(consulta)}`, {
    headers: { 'User-Agent': 'CanettiLocacoes-Rotas/1.0' },
    signal: AbortSignal.timeout(12000),
  });
  if (!resposta.ok) throw new Error('Não foi possível localizar uma das cidades agora. Tente novamente.');
  const resultados = await resposta.json() as Array<{ lat: string; lon: string; display_name: string }>;
  const primeiro = resultados[0];
  if (!primeiro) throw new Error(`Cidade não encontrada: ${cidade}. Confira o nome e o estado.`);

  const coordenada = { latitude: Number(primeiro.lat), longitude: Number(primeiro.lon), nome: primeiro.display_name };
  cacheCidades.set(chave, coordenada);
  return coordenada;
}

export async function calcularDistancia(cidades: string[]) {
  const pontos = await Promise.all(cidades.map(geocodificarCidade));
  const coordenadas = pontos.map((ponto) => `${ponto.longitude},${ponto.latitude}`).join(';');
  const resposta = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordenadas}?overview=full&geometries=geojson&steps=false`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!resposta.ok) throw new Error('Não foi possível calcular a rota de carro agora. Tente novamente.');
  const dados = await resposta.json() as { code?: string; routes?: Array<{ distance: number; duration: number; geometry?: { coordinates?: CoordenadaRota[] } }> };
  const rota = dados.routes?.[0];
  if (dados.code !== 'Ok' || !rota) throw new Error('Não foi encontrada uma rota de carro entre as cidades informadas.');
  const pedagios = localizarPedagios(rota.geometry?.coordinates ?? []);
  return {
    distanciaKm: Math.round(rota.distance / 100) / 10,
    duracaoMinutos: Math.round(rota.duration / 60),
    cidadesLocalizadas: pontos.map((ponto) => ponto.nome),
    pedagiosEstimados: pedagios.total,
    pedagiosConfigurados: true,
    pedagios: pedagios.pracas.map((praca) => ({ nome: praca.nome, valor: praca.valor })),
    pedagiosFonte: 'Base interna gratuita de praças de pedágio de SP',
  };
}

function distanciaAoSegmentoKm(ponto: PracaPedagio, inicio: CoordenadaRota, fim: CoordenadaRota) {
  const escalaLatitude = 111.32;
  const escalaLongitude = 111.32 * Math.cos(((ponto.latitude + inicio[1] + fim[1]) / 3) * Math.PI / 180);
  const ax = inicio[0] * escalaLongitude;
  const ay = inicio[1] * escalaLatitude;
  const bx = fim[0] * escalaLongitude;
  const by = fim[1] * escalaLatitude;
  const px = ponto.longitude * escalaLongitude;
  const py = ponto.latitude * escalaLatitude;
  const dx = bx - ax;
  const dy = by - ay;
  const tamanho = dx * dx + dy * dy;
  const proporcao = tamanho === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / tamanho));
  return Math.hypot(px - (ax + proporcao * dx), py - (ay + proporcao * dy));
}

function localizarPedagios(coordenadas: CoordenadaRota[]) {
  // 0,9 km abrange as pistas de cada sentido sem confundir praças de estradas próximas.
  const pracas = pracasPedagioSp.filter((praca) => coordenadas.slice(1).some((fim, indice) => distanciaAoSegmentoKm(praca, coordenadas[indice], fim) <= 0.9));
  return { pracas, total: Math.round(pracas.reduce((total, praca) => total + praca.valor, 0) * 100) / 100 };
}
