import * as XLSX from 'xlsx';
import {
  VisitasArea,
  VisitasPonto,
  VisitasTrajeto,
  VisitasVeiculo,
} from '@/types/visitas';
import { formatarArea } from './areaCalculator';

/**
 * Exporta Áreas e Pontos para arquivo GeoJSON padronizado (RFC 7946)
 */
export function exportarGeoJSON(areas: VisitasArea[], pontos: VisitasPonto[]): string {
  const features: any[] = [];

  // Polígonos de Áreas
  for (const area of areas) {
    if (area.vertices && area.vertices.length >= 3) {
      // GeoJSON requer coordenadas no formato [lng, lat] e anel fechado
      const coords = area.vertices.map((v) => [v[1], v[0]]);
      if (
        coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1]
      ) {
        coords.push(coords[0]);
      }

      features.push({
        type: 'Feature',
        id: area.id,
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
        properties: {
          tipo: 'Area',
          nome: area.nome,
          descricao: area.descricao ?? '',
          status: area.status,
          square_meters: area.square_meters,
          hectares: area.hectares,
          cor: area.cor,
        },
      });
    }
  }

  // Pontos de Interesse (Pins)
  for (const ponto of pontos) {
    features.push({
      type: 'Feature',
      id: ponto.id,
      geometry: {
        type: 'Point',
        coordinates: [Number(ponto.longitude), Number(ponto.latitude)],
      },
      properties: {
        tipo: 'Ponto',
        nome: ponto.nome,
        categoria: ponto.categoria,
        descricao: ponto.descricao ?? '',
        status: ponto.status,
        area_id: ponto.area_id ?? '',
      },
    });
  }

  const featureCollection = {
    type: 'FeatureCollection',
    name: 'SIG_Visitas_Exportacao',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features,
  };

  return JSON.stringify(featureCollection, null, 2);
}

/**
 * Exporta Pontos e Áreas para arquivo CSV
 */
export function exportarCSV(pontos: VisitasPonto[], areas: VisitasArea[]): string {
  const areaMap = new Map(areas.map((a) => [a.id, a.nome]));

  const headers = [
    'ID',
    'Nome',
    'Categoria',
    'Status',
    'Latitude',
    'Longitude',
    'Area_Vinculada',
    'Descricao',
  ];

  const rows = pontos.map((p) => [
    `"${p.id}"`,
    `"${p.nome.replace(/"/g, '""')}"`,
    `"${p.categoria}"`,
    `"${p.status}"`,
    p.latitude,
    p.longitude,
    `"${p.area_id ? (areaMap.get(p.area_id) ?? p.area_id) : 'Sem Área'}"`,
    `"${(p.descricao ?? '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Exporta dados completos para uma planilha Excel multi-abas (.xlsx)
 */
export function exportarExcelMultiAbas(
  areas: VisitasArea[],
  pontos: VisitasPonto[],
  trajetos: VisitasTrajeto[],
  veiculos: VisitasVeiculo[]
): Blob {
  const wb = XLSX.utils.book_new();

  // 1. Aba Áreas
  const dataAreas = areas.map((a) => ({
    'ID': a.id,
    'Nome da Área': a.nome,
    'Status': a.status,
    'Área (m²)': a.square_meters,
    'Área (Hectares)': a.hectares,
    'Quantidade de Vértices': a.vertices?.length ?? 0,
    'Descrição': a.descricao ?? '',
    'Data de Criação': a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '',
  }));
  const wsAreas = XLSX.utils.json_to_sheet(dataAreas);
  XLSX.utils.book_append_sheet(wb, wsAreas, 'Áreas Delimitadas');

  // 2. Aba Pontos
  const areaMap = new Map(areas.map((a) => [a.id, a.nome]));
  const dataPontos = pontos.map((p) => ({
    'ID': p.id,
    'Nome do Ponto': p.nome,
    'Categoria': p.categoria,
    'Status': p.status,
    'Latitude': p.latitude,
    'Longitude': p.longitude,
    'Área Associada': p.area_id ? (areaMap.get(p.area_id) ?? p.area_id) : 'Nenhuma',
    'Descrição': p.descricao ?? '',
    'Data': p.created_at ? new Date(p.created_at).toLocaleString('pt-BR') : '',
  }));
  const wsPontos = XLSX.utils.json_to_sheet(dataPontos);
  XLSX.utils.book_append_sheet(wb, wsPontos, 'Pontos de Visita');

  // 3. Aba Trajetos
  const veicMap = new Map(veiculos.map((v) => [v.id, v.nome]));
  const dataTrajetos = trajetos.map((t) => ({
    'ID': t.id,
    'Modo': t.modo === 'driving' ? 'Veículo' : 'A pé',
    'Distância (km)': (t.distance_meters / 1000).toFixed(2),
    'Tempo em Movimento (min)': Math.round(t.moving_seconds / 60),
    'Tempo em Paradas (min)': Math.round(t.visit_seconds / 60),
    'Litros Estimados': t.estimated_liters ?? 0,
    'Custo Estimado (R$)': t.estimated_cost ?? 0,
    'Veículo': t.veiculo_id ? (veicMap.get(t.veiculo_id) ?? t.veiculo_id) : 'N/A',
    'Iniciado Em': new Date(t.started_at).toLocaleString('pt-BR'),
    'Finalizado Em': t.ended_at ? new Date(t.ended_at).toLocaleString('pt-BR') : '',
  }));
  const wsTrajetos = XLSX.utils.json_to_sheet(dataTrajetos);
  XLSX.utils.book_append_sheet(wb, wsTrajetos, 'Trajetos e Percursos');

  // 4. Aba Veículos
  const dataVeiculos = veiculos.map((v) => ({
    'Nome do Veículo': v.nome,
    'Placa': v.placa ?? 'Sem placa',
    'Combustível': v.tipo_combustivel,
    'Consumo (km/L)': v.consumo_km_l,
    'Preço por Litro (R$)': v.preco_litro,
    'Status': v.ativo ? 'Ativo' : 'Inativo',
  }));
  const wsVeiculos = XLSX.utils.json_to_sheet(dataVeiculos);
  XLSX.utils.book_append_sheet(wb, wsVeiculos, 'Frota de Veículos');

  // Gera o buffer binário
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Dispara o download de um arquivo no navegador do usuário
 */
export function baixarArquivo(
  conteudo: string | Blob,
  nomeArquivo: string,
  tipoMime: string = 'text/plain;charset=utf-8'
) {
  const blob =
    typeof conteudo === 'string' ? new Blob([conteudo], { type: tipoMime }) : conteudo;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
