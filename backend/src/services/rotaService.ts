type Coordenada = { latitude: number; longitude: number; nome: string };

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
  };
}
