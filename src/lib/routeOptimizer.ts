/**
 * Utilitario de Otimizacao de Rotas e Calculo de Consumo de Combustivel
 * SIG - Sapeacu / BA
 */

export interface PontoLocalizacao {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  tipo?: string;
  endereco?: string | null;
  localizacao?: string | null;
  ordem?: number;
}

export interface ResultadoRoteiro {
  pontosOrdenados: PontoLocalizacao[];
  coordenadasPolyline: [number, number][];
  distanciaTotalKm: number;
  consumoLitros: number;
  custoTotalReais: number;
  tempoEstimadoMinutos: number;
  tramos: Array<{
    origem: string;
    destino: string;
    distanciaKm: number;
    tempoMinutos: number;
  }>;
  googleMapsUrl: string;
  origemDefinida: PontoLocalizacao;
}

// Coordenadas padrao da Secretaria Municipal de Educacao / Centro de Sapeacu
export const SEDE_SEMED_SAPEACU: PontoLocalizacao = {
  id: 'sede-semed',
  nome: 'Secretaria Municipal de Educação (SEMED)',
  latitude: -12.7299932,
  longitude: -39.1858195,
  tipo: 'SECRETARIA',
  endereco: 'Centro, Sapeaçu - BA',
  localizacao: 'URBANA',
};

/**
 * Sanitiza e valida coordenadas geograficas.
 */
export function parseCoordinate(coord: any): number | null {
  if (coord === null || coord === undefined) return null;
  if (typeof coord === 'number') {
    if (isNaN(coord) || coord === 0) return null;
    return coord;
  }
  if (typeof coord === 'string') {
    const limpo = coord.trim().replace(',', '.');
    const num = parseFloat(limpo);
    if (isNaN(num) || num === 0) return null;
    return num;
  }
  return null;
}

/**
 * Calcula a distancia geodesica em linha reta (em Km) entre dois pontos usando Haversine.
 */
export function calcularDistanciaHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Number(d.toFixed(2));
}

const FATOR_CURVATURA_VIARIA = 1.28;

export function calcularConsumo(
  distanciaKm: number,
  consumoKmL: number,
  precoLitro: number
): { litros: number; custo: number } {
  const safeKmL = consumoKmL > 0 ? consumoKmL : 10.0;
  const safePreco = precoLitro > 0 ? precoLitro : 6.29;

  const litros = Number((distanciaKm / safeKmL).toFixed(2));
  const custo = Number((litros * safePreco).toFixed(2));

  return { litros, custo };
}

/**
 * Algoritmo TSP para encontrar a ordem otima de visitacao.
 */
export function otimizarOrdemVisitas(
  pontoInicial: PontoLocalizacao,
  destinos: PontoLocalizacao[],
  retornarAoInicio: boolean = false
): PontoLocalizacao[] {
  if (destinos.length <= 1) {
    return [pontoInicial, ...destinos, ...(retornarAoInicio ? [pontoInicial] : [])];
  }

  const calcularDistanciaTotal = (ordem: PontoLocalizacao[]): number => {
    let total = 0;
    for (let i = 0; i < ordem.length - 1; i++) {
      total += calcularDistanciaHaversine(
        ordem[i].latitude,
        ordem[i].longitude,
        ordem[i + 1].latitude,
        ordem[i + 1].longitude
      );
    }
    return total;
  };

  if (destinos.length <= 7) {
    let melhorOrdem: PontoLocalizacao[] = [];
    let menorDistancia = Infinity;

    const permutar = (arr: PontoLocalizacao[], m: PontoLocalizacao[] = []) => {
      if (arr.length === 0) {
        const rotaCompleta = [pontoInicial, ...m, ...(retornarAoInicio ? [pontoInicial] : [])];
        const dist = calcularDistanciaTotal(rotaCompleta);
        if (dist < menorDistancia) {
          menorDistancia = dist;
          melhorOrdem = rotaCompleta;
        }
      } else {
        for (let i = 0; i < arr.length; i++) {
          const curr = arr.slice();
          const next = curr.splice(i, 1);
          permutar(curr.slice(), m.concat(next));
        }
      }
    };

    permutar(destinos);
    return melhorOrdem;
  }

  const naoVisitados = [...destinos];
  const rotaGuloso: PontoLocalizacao[] = [pontoInicial];
  let pontoAtual = pontoInicial;

  while (naoVisitados.length > 0) {
    let maisProximoIdx = 0;
    let menorDist = Infinity;

    for (let i = 0; i < naoVisitados.length; i++) {
      const dist = calcularDistanciaHaversine(
        pontoAtual.latitude,
        pontoAtual.longitude,
        naoVisitados[i].latitude,
        naoVisitados[i].longitude
      );
      if (dist < menorDist) {
        menorDist = dist;
        maisProximoIdx = i;
      }
    }

    pontoAtual = naoVisitados.splice(maisProximoIdx, 1)[0];
    rotaGuloso.push(pontoAtual);
  }

  if (retornarAoInicio) {
    rotaGuloso.push(pontoInicial);
  }

  let melhorRota = [...rotaGuloso];
  let melhorou = true;
  let iteracoes = 0;

  while (melhorou && iteracoes < 50) {
    melhorou = false;
    iteracoes++;
    const maxIdx = retornarAoInicio ? melhorRota.length - 2 : melhorRota.length - 1;

    for (let i = 1; i < maxIdx; i++) {
      for (let k = i + 1; k < maxIdx + 1; k++) {
        const novaRota = [
          ...melhorRota.slice(0, i),
          ...melhorRota.slice(i, k + 1).reverse(),
          ...melhorRota.slice(k + 1),
        ];

        if (calcularDistanciaTotal(novaRota) < calcularDistanciaTotal(melhorRota)) {
          melhorRota = novaRota;
          melhorou = true;
          break;
        }
      }
      if (melhorou) break;
    }
  }

  return melhorRota;
}

export async function obterRotaViariaReal(
  pontos: PontoLocalizacao[],
  consumoKmL: number = 10,
  precoLitro: number = 6.29
): Promise<ResultadoRoteiro> {
  const origem = pontos[0];
  const fallbackPolyline: [number, number][] = pontos.map((p) => [p.latitude, p.longitude]);

  let distHaversineTotal = 0;
  const tramosFallback: Array<{ origem: string; destino: string; distanciaKm: number; tempoMinutos: number }> = [];

  for (let i = 0; i < pontos.length - 1; i++) {
    const distGeodesica = calcularDistanciaHaversine(
      pontos[i].latitude,
      pontos[i].longitude,
      pontos[i + 1].latitude,
      pontos[i + 1].longitude
    );
    const distViariaEst = Number((distGeodesica * FATOR_CURVATURA_VIARIA).toFixed(2));
    distHaversineTotal += distViariaEst;

    const tempoMin = Math.max(2, Math.round((distViariaEst / 35) * 60));
    tramosFallback.push({
      origem: pontos[i].nome,
      destino: pontos[i + 1].nome,
      distanciaKm: distViariaEst,
      tempoMinutos: tempoMin,
    });
  }

  const googleMapsUrl = gerarLinkGoogleMaps(pontos);

  try {
    const coordsQuery = pontos.map((p) => `${p.longitude},${p.latitude}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson&steps=false`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const rota = data.routes[0];
        const distanciaRealKm = Number((rota.distance / 1000).toFixed(2));
        const tempoMinutos = Math.round(rota.duration / 60);

        const coordsGeoJson = rota.geometry.coordinates as [number, number][];
        const polylineLeaflet: [number, number][] = coordsGeoJson.map(([lon, lat]) => [lat, lon]);

        const { litros, custo } = calcularConsumo(distanciaRealKm, consumoKmL, precoLitro);

        const tramosReais = tramosFallback.map((t) => {
          const ratio = distHaversineTotal > 0 ? distanciaRealKm / distHaversineTotal : 1;
          return {
            ...t,
            distanciaKm: Number((t.distanciaKm * ratio).toFixed(2)),
            tempoMinutos: Math.round(t.tempoMinutos * ratio),
          };
        });

        return {
          pontosOrdenados: pontos.map((p, idx) => ({ ...p, ordem: idx + 1 })),
          coordenadasPolyline: polylineLeaflet,
          distanciaTotalKm: distanciaRealKm,
          consumoLitros: litros,
          custoTotalReais: custo,
          tempoEstimadoMinutos: tempoMinutos,
          tramos: tramosReais,
          googleMapsUrl,
          origemDefinida: origem,
        };
      }
    }
  } catch {
    // Fallback silencioso
  }

  const { litros, custo } = calcularConsumo(distHaversineTotal, consumoKmL, precoLitro);
  const tempoTotalMin = tramosFallback.reduce((acc, curr) => acc + curr.tempoMinutos, 0);

  return {
    pontosOrdenados: pontos.map((p, idx) => ({ ...p, ordem: idx + 1 })),
    coordenadasPolyline: fallbackPolyline,
    distanciaTotalKm: Number(distHaversineTotal.toFixed(2)),
    consumoLitros: litros,
    custoTotalReais: custo,
    tempoEstimadoMinutos: tempoTotalMin,
    tramos: tramosFallback,
    googleMapsUrl,
    origemDefinida: origem,
  };
}

export function gerarLinkGoogleMaps(pontos: PontoLocalizacao[]): string {
  if (pontos.length === 0) return 'https://www.google.com/maps';
  if (pontos.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${pontos[0].latitude},${pontos[0].longitude}`;
  }

  const origin = `${pontos[0].latitude},${pontos[0].longitude}`;
  const destination = `${pontos[pontos.length - 1].latitude},${pontos[pontos.length - 1].longitude}`;

  const waypoints = pontos
    .slice(1, -1)
    .slice(0, 9)
    .map((p) => `${p.latitude},${p.longitude}`)
    .join('|');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) {
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }
  url += '&travelmode=driving';

  return url;
}
