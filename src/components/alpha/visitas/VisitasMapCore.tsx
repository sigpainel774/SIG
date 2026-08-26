'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Polygon,
  Polyline,
  Marker,
  Popup,
  Circle,
  ImageOverlay,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CoordinateTuple,
  VisitasArea,
  VisitasPonto,
  VisitasGeoPdfMap,
  AreaStatus,
} from '@/types/visitas';
import { cn } from '@/lib/utils';
import { MapInteractionMode } from './VisitasDrawingToolbar';
import {
  formatarArea,
  calcularDistanciaMetros,
  calcularCentroide,
} from '@/lib/visitas/areaCalculator';
import {
  obterVisitasConfig,
  gerarIconeLeafletCursor,
  VisitasConfig,
} from '@/lib/visitas/visitasConfigService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Info, Edit3, Trash2, Maximize2, Compass } from 'lucide-react';

// Fix dos ícones padrões do Leaflet para Next.js / Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Gerador de ícone para categorias de pontos
const criarIconeCategoria = (categoria: string, status: string) => {
  let corBg = 'bg-blue-600';
  if (categoria === 'Problema') corBg = 'bg-rose-600';
  if (categoria === 'Observacao') corBg = 'bg-amber-600';
  if (categoria === 'Imovel') corBg = 'bg-indigo-600';
  if (categoria === 'Vegetacao') corBg = 'bg-emerald-600';
  if (status === 'visitado') corBg = 'bg-teal-600';

  return L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div class="relative flex flex-col items-center" style="transform: translate(-50%, -100%);">
        <div class="w-8 h-8 rounded-full ${corBg} border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-110">
          📍
        </div>
        <div class="w-1.5 h-2 bg-slate-900 shadow-xs"></div>
      </div>
    `,
    iconSize: [32, 36],
    iconAnchor: [16, 36],
  });
};

export interface UserLocationState {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
}

interface VisitasMapCoreProps {
  center: CoordinateTuple;
  zoom: number;
  mode: MapInteractionMode;
  draftVertices: CoordinateTuple[];
  onAddDraftVertex: (vertex: CoordinateTuple) => void;
  onFinishDraftPolygon: () => void;
  onPointMapClick: (lat: number, lng: number) => void;
  areas: VisitasArea[];
  pontos: VisitasPonto[];
  activeGeoPdf?: VisitasGeoPdfMap | null;
  userLocation?: UserLocationState | null;
  onSelectArea?: (area: VisitasArea) => void;
  onSelectPonto?: (ponto: VisitasPonto) => void;
  onEditArea?: (area: VisitasArea) => void;
  onDeleteArea?: (areaId: string) => void;
  onUpdateAreaStatus?: (areaId: string, status: AreaStatus) => void;
}

// Componente interno para gerenciar eventos de clique e snap no Canvas
function MapEventsHandler({
  mode,
  draftVertices,
  onAddDraftVertex,
  onFinishDraftPolygon,
  onPointMapClick,
}: {
  mode: MapInteractionMode;
  draftVertices: CoordinateTuple[];
  onAddDraftVertex: (vertex: CoordinateTuple) => void;
  onFinishDraftPolygon: () => void;
  onPointMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;

      if (mode === 'draw_polygon') {
        // Se clicar próximo ao primeiro vértice, conclui o polígono (Snap to start)
        if (draftVertices.length >= 3) {
          const primeiro = draftVertices[0];
          const distMetros = calcularDistanciaMetros(primeiro[0], primeiro[1], lat, lng);
          if (distMetros < 15) {
            onFinishDraftPolygon();
            return;
          }
        }
        onAddDraftVertex([lat, lng]);
      } else if (mode === 'add_point') {
        onPointMapClick(lat, lng);
      }
    },
  });

  return null;
}

// Componente para animar a câmera suavemente quando a posição central mudar
function MapCameraController({ center, zoom }: { center: CoordinateTuple; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

export default function VisitasMapCore({
  center,
  zoom,
  mode,
  draftVertices,
  onAddDraftVertex,
  onFinishDraftPolygon,
  onPointMapClick,
  areas = [],
  pontos = [],
  activeGeoPdf,
  userLocation = null,
  onSelectArea,
  onSelectPonto,
  onEditArea,
  onDeleteArea,
  onUpdateAreaStatus,
}: VisitasMapCoreProps) {
  const [visitasConfig, setVisitasConfig] = useState<VisitasConfig>(obterVisitasConfig);

  // Escuta alterações de configuração do cursor para reatividade imediata (ES-ICON-05)
  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e?.detail) {
        setVisitasConfig(e.detail);
      } else {
        setVisitasConfig(obterVisitasConfig());
      }
    };
    window.addEventListener('sig_visitas_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('sig_visitas_config_updated', handleConfigUpdate);
  }, []);

  // Converte rascunho de polígono para formato de polyline
  const draftPolyline = useMemo(() => {
    return draftVertices.map((v) => [v[0], v[1]] as [number, number]);
  }, [draftVertices]);

  // Ícone do usuário gerado a partir das preferências do sistema
  const iconeUsuario = useMemo(() => {
    const heading = userLocation?.heading ?? 0;
    return gerarIconeLeafletCursor(visitasConfig, heading, {
      tamanho: 48,
      mostrarRadar: true,
      corPulso: 'bg-blue-500/30',
    });
  }, [visitasConfig, userLocation?.heading]);

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-border shadow-2xl bg-zinc-950">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Google Satélite (Híbrido)">
            <TileLayer
              attribution="&copy; Google Maps"
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              maxZoom={20}
              keepBuffer={6}
              updateWhenIdle={true}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Google Ruas">
            <TileLayer
              attribution="&copy; Google Maps"
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              maxZoom={20}
              keepBuffer={6}
              updateWhenIdle={true}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Google Terreno">
            <TileLayer
              attribution="&copy; Google Maps"
              url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
              maxZoom={20}
              keepBuffer={6}
              updateWhenIdle={true}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Mapa de Ruas (OpenStreetMap)">
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              keepBuffer={8}
              updateWhenIdle={true}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MapCameraController center={center} zoom={zoom} />

        <MapEventsHandler
          mode={mode}
          draftVertices={draftVertices}
          onAddDraftVertex={onAddDraftVertex}
          onFinishDraftPolygon={onFinishDraftPolygon}
          onPointMapClick={onPointMapClick}
        />

        {/* Sobreposição de Camada GeoPDF Calibrada */}
        {activeGeoPdf &&
          activeGeoPdf.is_visible &&
          activeGeoPdf.imagem_renderizada_url &&
          activeGeoPdf.geo_bounds && (
            <ImageOverlay
              url={activeGeoPdf.imagem_renderizada_url}
              bounds={[
                [activeGeoPdf.geo_bounds.south, activeGeoPdf.geo_bounds.west],
                [activeGeoPdf.geo_bounds.north, activeGeoPdf.geo_bounds.east],
              ]}
              opacity={activeGeoPdf.opacidade}
              zIndex={500}
            />
          )}

        {/* Marcador e Halo de Precisão da Posição do Usuário ("Onde Estou") */}
        {userLocation && (
          <React.Fragment key="user-location-marker-group">
            {/* Halo de precisão em metros */}
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={Math.max(10, userLocation.accuracy ?? 20)}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 1.5,
              }}
            />

            {/* Marcador do Usuário com Ícone Customizado / Padrão e Radar */}
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={iconeUsuario}
              zIndexOffset={1000}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-2.5 text-xs space-y-1.5 min-w-[200px]">
                  <div className="flex items-center gap-2 border-b border-border pb-1 text-blue-400 font-bold">
                    <Compass className="w-4 h-4" />
                    <span>Sua Localização GPS</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    Lat: {userLocation.lat.toFixed(6)}
                    <br />
                    Lng: {userLocation.lng.toFixed(6)}
                  </div>
                  {userLocation.accuracy && (
                    <div className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                      Precisão: ~{Math.round(userLocation.accuracy)} metros
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        )}

        {/* Polígonos das Áreas Delimitadas Salvas */}
        {areas
          .filter((area) => !area.deleted_at && area.vertices && area.vertices.length >= 3)
          .map((area) => {
            const positions = area.vertices.map(
              (v) => [v[0], v[1]] as [number, number]
            );
            const centroide = calcularCentroide(area.vertices);

            return (
              <React.Fragment key={area.id}>
                <Polygon
                  positions={positions}
                  pathOptions={{
                    color: area.cor || '#3b82f6',
                    fillColor: area.cor || '#3b82f6',
                    fillOpacity: 0.35,
                    weight: 3,
                  }}
                  eventHandlers={{
                    click: () => {
                      if (onSelectArea) {
                        onSelectArea(area);
                      }
                    },
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-3 text-xs space-y-2.5 min-w-[220px]">
                      <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5">
                        <span className="font-bold text-sm text-foreground">
                          {area.nome}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] uppercase font-bold',
                            area.status === 'concluido'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : area.status === 'em_andamento'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          )}
                        >
                          {area.status === 'concluido'
                            ? 'Concluído'
                            : area.status === 'em_andamento'
                            ? 'Em Curso'
                            : 'Não Iniciado'}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-[11px] text-muted-foreground">
                        <div>
                          Área:{' '}
                          <strong className="text-foreground">
                            {formatarArea(area.square_meters)}
                          </strong>
                        </div>
                        {area.descricao && (
                          <div className="text-slate-300 italic">
                            "{area.descricao}"
                          </div>
                        )}
                      </div>

                      {/* Seletor Rápido de Status no Popup */}
                      {onUpdateAreaStatus && (
                        <div className="pt-1.5 border-t border-border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                            Alterar Status:
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              type="button"
                              onClick={() => onUpdateAreaStatus(area.id, 'pendente')}
                              className={cn(
                                'px-1.5 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer text-center',
                                area.status === 'pendente'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-accent/60 hover:bg-accent text-muted-foreground'
                              )}
                            >
                              Pendente
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateAreaStatus(area.id, 'em_andamento')}
                              className={cn(
                                'px-1.5 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer text-center',
                                area.status === 'em_andamento'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-accent/60 hover:bg-accent text-muted-foreground'
                              )}
                            >
                              Em Curso
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateAreaStatus(area.id, 'concluido')}
                              className={cn(
                                'px-1.5 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer text-center',
                                area.status === 'concluido'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-accent/60 hover:bg-accent text-muted-foreground'
                              )}
                            >
                              Concluído
                            </button>
                          </div>
                        </div>
                      )}

                      {mode === 'select' && (
                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border">
                          {onEditArea && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEditArea(area)}
                              className="h-7 text-xs gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              Editar
                            </Button>
                          )}
                          {onDeleteArea && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDeleteArea(area.id)}
                              className="h-7 w-7 p-0 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Polygon>

                {/* Marcador de Centroide da Área com Nome */}
                <Marker
                  position={centroide}
                  icon={L.divIcon({
                    className: 'area-label-marker',
                    html: `
                      <div class="px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-700 text-white font-bold text-[10px] whitespace-nowrap shadow-lg backdrop-blur-xs" style="transform: translate(-50%, -50%);">
                        ${area.nome}
                      </div>
                    `,
                    iconSize: [80, 20],
                    iconAnchor: [40, 10],
                  })}
                />
              </React.Fragment>
            );
          })}

        {/* Marcadores de Pontos de Interesse Salvos */}
        {pontos
          .filter((ponto) => !ponto.deleted_at && ponto.latitude && ponto.longitude)
          .map((ponto) => (
            <Marker
              key={ponto.id}
              position={[Number(ponto.latitude), Number(ponto.longitude)]}
              icon={criarIconeCategoria(ponto.categoria, ponto.status)}
              eventHandlers={{
                click: () => {
                  if (mode === 'select' && onSelectPonto) {
                    onSelectPonto(ponto);
                  }
                },
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-3 text-xs space-y-2 min-w-[220px]">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5">
                    <span className="font-bold text-sm text-foreground">
                      {ponto.nome}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-bold"
                    >
                      {ponto.categoria}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <div>
                      Coordenadas:{' '}
                      <span className="font-mono text-foreground">
                        {Number(ponto.latitude).toFixed(5)},{' '}
                        {Number(ponto.longitude).toFixed(5)}
                      </span>
                    </div>
                    <div>
                      Status:{' '}
                      <span className="capitalize font-semibold text-foreground">
                        {ponto.status}
                      </span>
                    </div>
                    {ponto.descricao && (
                      <div className="mt-1 text-slate-300 italic">
                        "{ponto.descricao}"
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Polígono e Vértices do Rascunho Atual */}
        {draftVertices.length > 0 && (
          <>
            <Polyline
              positions={draftPolyline}
              pathOptions={{
                color: '#38bdf8',
                dashArray: '6, 8',
                weight: 3,
                opacity: 0.9,
              }}
            />

            {draftVertices.length >= 3 && (
              <Polygon
                positions={draftPolyline}
                pathOptions={{
                  color: '#38bdf8',
                  fillColor: '#38bdf8',
                  fillOpacity: 0.25,
                  weight: 2,
                }}
              />
            )}

            {/* Marcadores nos vértices do rascunho */}
            {draftVertices.map((vertex, idx) => {
              const isFirst = idx === 0;
              return (
                <Marker
                  key={`draft-${idx}`}
                  position={[vertex[0], vertex[1]]}
                  icon={L.divIcon({
                    className: 'draft-vertex-marker',
                    html: `
                      <div class="w-4 h-4 rounded-full ${
                        isFirst
                          ? 'bg-emerald-500 ring-4 ring-emerald-400/40 animate-pulse'
                          : 'bg-sky-400'
                      } border-2 border-white shadow-md flex items-center justify-center text-[9px] font-bold text-white" style="transform: translate(-50%, -50%);">
                        ${isFirst ? '●' : idx + 1}
                      </div>
                    `,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                  })}
                />
              );
            })}
          </>
        )}
      </MapContainer>
    </div>
  );
}
