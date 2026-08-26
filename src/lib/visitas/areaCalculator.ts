import { CoordinateTuple } from '@/types/visitas';

const EARTH_RADIUS_METERS = 6378137.0; // WGS84 Raio equatorial médio

/**
 * Converte graus para radianos
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converte radianos para graus
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calcula a distância geodésica em metros entre dois pontos (Haversine)
 */
export function calcularDistanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calcula a área esférica exata em metros quadrados de um polígono de coordenadas [lat, lng]
 * Utiliza a projeção esférica geodésica WGS84 para evitar distorções de coordenadas planas.
 */
export function calcularAreaPoligonoMetrosQuadrados(vertices: CoordinateTuple[]): number {
  if (!vertices || vertices.length < 3) return 0;

  // Garante que o polígono não tenha o vértice final repetido para o cálculo
  const coords = [...vertices];
  if (
    coords.length > 3 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1]
  ) {
    coords.pop();
  }

  if (coords.length < 3) return 0;

  let totalArea = 0;
  const numPoints = coords.length;

  for (let i = 0; i < numPoints; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % numPoints];

    const lat1 = toRadians(p1[0]);
    const lon1 = toRadians(p1[1]);
    const lat2 = toRadians(p2[0]);
    const lon2 = toRadians(p2[1]);

    totalArea += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  totalArea = (Math.abs(totalArea) * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2.0;
  return Number(totalArea.toFixed(2));
}

/**
 * Converte metros quadrados para hectares
 */
export function metrosQuadradosParaHectares(m2: number): number {
  return Number((m2 / 10000).toFixed(4));
}

/**
 * Formata área de forma amigável (m² ou ha)
 */
export function formatarArea(m2: number): string {
  if (m2 >= 10000) {
    const ha = m2 / 10000;
    return `${ha.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ha`;
  }
  return `${m2.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
}

/**
 * Calcula o centroide geográfico de um polígono
 */
export function calcularCentroide(vertices: CoordinateTuple[]): CoordinateTuple {
  if (!vertices || vertices.length === 0) return [-12.7214, -39.1989]; // Fallback Sapeaçu-BA
  if (vertices.length === 1) return vertices[0];

  let sumLat = 0;
  let sumLng = 0;
  const count = vertices.length;

  for (const [lat, lng] of vertices) {
    sumLat += lat;
    sumLng += lng;
  }

  return [sumLat / count, sumLng / count];
}

/**
 * Determina se um ponto [lat, lng] está contido dentro de um polígono (Ray-casting algorithm)
 */
export function pontoDentroDoPoligono(
  ponto: CoordinateTuple,
  vertices: CoordinateTuple[]
): boolean {
  if (!vertices || vertices.length < 3) return false;

  const [x, y] = [ponto[1], ponto[0]]; // x = lng, y = lat
  let inside = false;

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][1];
    const yi = vertices[i][0];
    const xj = vertices[j][1];
    const yj = vertices[j][0];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calcula o ângulo (bearing / azimuth) em graus (0..360) entre duas coordenadas
 */
export function calcularBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDegrees(theta) + 360) % 360;
}
