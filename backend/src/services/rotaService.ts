type Coordenada = { latitude: number; longitude: number; nome: string };
type RotaGoogle = {
  distanceMeters?: number;
  duration?: string;
  travelAdvisory?: { tollInfo?: { estimatedPrice?: Array<{ currencyCode?: string; units?: string; nanos?: number }> } };
  legs?: Array<{ travelAdvisory?: { tollInfo?: { estimatedPrice?: Array<{ currencyCode?: string; units?: string; nanos?: number }> } } }>;
};

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
  const rotaGoogle = await calcularRotaGoogle(pontos);
  if (rotaGoogle) return rotaGoogle;

  const coordenadas = pontos.map((ponto) => `${ponto.longitude},${ponto.latitude}`).join(';');
  const resposta = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordenadas}?overview=false&steps=false`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!resposta.ok) throw new Error('Não foi possível calcular a rota de carro agora. Tente novamente.');
  const dados = await resposta.json() as { code?: string; routes?: Array<{ distance: number; duration: number }> };
  const rota = dados.routes?.[0];
  if (dados.code !== 'Ok' || !rota) throw new Error('Não foi encontrada uma rota de carro entre as cidades informadas.');
  return {
    distanciaKm: Math.round(rota.distance / 100) / 10,
    duracaoMinutos: Math.round(rota.duration / 60),
    cidadesLocalizadas: pontos.map((ponto) => ponto.nome),
    pedagiosEstimados: null,
    pedagiosConfigurados: false,
  };
}

function pontoGoogle(ponto: Coordenada) {
  return { location: { latLng: { latitude: ponto.latitude, longitude: ponto.longitude } } };
}

function segundosGoogle(duracao?: string) {
  return Math.round(Number((duracao || '0s').replace('s', '')) / 60);
}

function valorDaLista(precos?: Array<{ currencyCode?: string; units?: string; nanos?: number }>) {
  const preco = precos?.find((item) => item.currencyCode === 'BRL') ?? precos?.[0];
  return preco ? Number(preco.units || 0) + Number(preco.nanos || 0) / 1_000_000_000 : null;
}

function valorPedagios(rota: RotaGoogle) {
  const totalDaRota = valorDaLista(rota.travelAdvisory?.tollInfo?.estimatedPrice);
  if (totalDaRota !== null) return totalDaRota;

  // Em alguns trajetos, a API informa a tarifa por trecho (leg), não no total da rota.
  const valoresPorTrecho = rota.legs
    ?.map((trecho) => valorDaLista(trecho.travelAdvisory?.tollInfo?.estimatedPrice))
    .filter((valor): valor is number => valor !== null) ?? [];
  return valoresPorTrecho.length ? valoresPorTrecho.reduce((total, valor) => total + valor, 0) : null;
}

async function calcularRotaGoogle(pontos: Coordenada[]) {
  const chave = process.env.GOOGLE_MAPS_API_KEY;
  if (!chave) return null;

  try {
    const resposta = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': chave,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.travelAdvisory.tollInfo,routes.legs.travelAdvisory.tollInfo',
      },
      body: JSON.stringify({
        origin: pontoGoogle(pontos[0]),
        destination: pontoGoogle(pontos[pontos.length - 1]),
        intermediates: pontos.slice(1, -1).map(pontoGoogle),
        travelMode: 'DRIVE',
        extraComputations: ['TOLLS'],
        routeModifiers: { vehicleInfo: { emissionType: 'GASOLINE' } },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resposta.ok) return null;
    const dados = await resposta.json() as { routes?: RotaGoogle[] };
    const rota = dados.routes?.[0];
    if (!rota?.distanceMeters) return null;
    return {
      distanciaKm: Math.round(rota.distanceMeters / 100) / 10,
      duracaoMinutos: segundosGoogle(rota.duration),
      cidadesLocalizadas: pontos.map((ponto) => ponto.nome),
      pedagiosEstimados: valorPedagios(rota),
      pedagiosConfigurados: true,
    };
  } catch {
    return null;
  }
}
