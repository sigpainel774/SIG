export type CoordinateTuple = [number, number]; // [lat, lng]

export type AreaStatus = 'pendente' | 'em_andamento' | 'concluido';

export interface VisitasArea {
  id: string;
  nome: string;
  descricao?: string | null;
  status: AreaStatus;
  vertices: CoordinateTuple[];
  square_meters: number;
  hectares: number;
  cor: string;
  usuario_id?: string | null;
  escola_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type PontoCategoria =
  | 'Geral'
  | 'Problema'
  | 'Observacao'
  | 'Visita'
  | 'Imovel'
  | 'Vegetacao'
  | 'Outro';

export type PontoStatus = 'pendente' | 'visitado' | 'ignorado';

export interface VisitasPonto {
  id: string;
  area_id?: string | null;
  nome: string;
  categoria: PontoCategoria;
  descricao?: string | null;
  latitude: number;
  longitude: number;
  status: PontoStatus;
  usuario_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  fotos?: VisitasFoto[];
}

export type EntidadeFotoTipo = 'area' | 'ponto' | 'trajeto';

export interface VisitasFoto {
  id: string;
  entidade_tipo: EntidadeFotoTipo;
  entidade_id: string;
  file_path: string;
  url: string;
  descricao?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  usuario_id?: string | null;
  created_at?: string;
  deleted_at?: string | null;
}

export type TipoCombustivel = 'gasolina' | 'etanol' | 'diesel' | 'gnv' | 'eletrico';

export interface VisitasVeiculo {
  id: string;
  nome: string;
  placa?: string | null;
  motor?: string | null;
  tipo_combustivel: TipoCombustivel;
  consumo_km_l: number;
  preco_litro: number;
  ativo: boolean;
  usuario_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type RoteiroStatus = 'planejado' | 'em_execucao' | 'finalizado';

export interface VisitasRoteiro {
  id: string;
  nome: string;
  area_ids: string[];
  veiculo_id?: string | null;
  data_planejada: string;
  status: RoteiroStatus;
  observacoes?: string | null;
  usuario_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type TravelMode = 'walking' | 'driving';
export type MovementState = 'moving' | 'stopped' | 'visit';

export interface TrackWaypoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speedKmh: number;
  speedMps: number;
  heading: number;
  accuracy: number;
  state?: MovementState;
  distanceM?: number;
}

export interface RouteVisit {
  id: string;
  trackId: string;
  startedAt: string;
  endedAt: string;
  latitude: number;
  longitude: number;
  areaId?: string | null;
  areaNome?: string | null;
  durationSeconds: number;
}

export interface VisitasTrajeto {
  id: string;
  area_id?: string | null;
  roteiro_id?: string | null;
  veiculo_id?: string | null;
  modo: TravelMode;
  started_at: string;
  ended_at?: string | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  distance_meters: number;
  moving_seconds: number;
  visit_seconds: number;
  estimated_liters?: number | null;
  estimated_cost?: number | null;
  posicoes: TrackWaypoint[];
  visitas_registradas: RouteVisit[];
  usuario_id?: string | null;
  created_at?: string;
  deleted_at?: string | null;
}

// Versão leve para listagens de alta performance (sem carregar milhares de coordenadas)
export type VisitasTrajetoResumo = Omit<VisitasTrajeto, 'posicoes'>;

export interface PdfControlPoint {
  id: string;
  pdfX: number; // 0..1 (percentual da largura da página)
  pdfY: number; // 0..1 (percentual da altura da página)
  lat: number;
  lng: number;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface VisitasGeoPdfMap {
  id: string;
  nome: string;
  pdf_url: string;
  imagem_renderizada_url?: string | null;
  numero_pagina: number;
  pontos_controle: PdfControlPoint[];
  opacidade: number;
  rotacao: number;
  is_visible: boolean;
  origem_calibracao: 'manual' | 'automaticGeoPdf';
  crs?: string;
  geo_bounds?: GeoBounds | null;
  viewport?: any;
  usuario_id?: string | null;
  created_at?: string;
  deleted_at?: string | null;
}

export type ActiveVisitasTab =
  | 'mapa'
  | 'areas'
  | 'pontos'
  | 'roteiros'
  | 'rastreamento'
  | 'historico'
  | 'veiculos'
  | 'geopdf'
  | 'exportar';
