'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Navigation,
  Sliders,
  Check,
  X,
  Loader2,
  HelpCircle,
  Sparkles,
  Type,
  Palette,
  ZoomIn,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Localidade,
  TipoLocalidade,
  PesoFonteLocalidade,
  LocalidadeInsert,
} from '@/types/localidades';
import { useLocalidades } from '@/hooks/useLocalidades';
import {
  salvarLocalidade,
  excluirLocalidade,
  alternarStatusLocalidade,
} from '@/lib/localidadesService';
import LocalidadesLayer, {
  ICONES_TIPO_LOCALIDADE,
  ROTULOS_TIPO_LOCALIDADE,
} from '@/components/map/LocalidadesLayer';
import { useAuthStore } from '@/store/useAuthStore';

const SAPEACU_LAT = -12.7299932;
const SAPEACU_LNG = -39.1858195;

const PALETA_CORES_TEXTO = [
  { label: 'Branco', valor: '#ffffff' },
  { label: 'Amarelo', valor: '#facc15' },
  { label: 'Ciano', valor: '#38bdf8' },
  { label: 'Esmeralda', valor: '#34d399' },
  { label: 'Laranja', valor: '#fb923c' },
  { label: 'Rosa', valor: '#f472b6' },
  { label: 'Violeta', valor: '#c084fc' },
];

const PALETA_CORES_FUNDO = [
  { label: 'Escuro Translúcido', valor: 'rgba(15, 23, 42, 0.85)' },
  { label: 'Preto Sólido', valor: '#090d16' },
  { label: 'Azul Petróleo', valor: 'rgba(12, 74, 110, 0.85)' },
  { label: 'Verde Floresta', valor: 'rgba(6, 78, 59, 0.85)' },
  { label: 'Dourado Terroso', valor: 'rgba(120, 53, 15, 0.85)' },
  { label: 'Vinho', valor: 'rgba(136, 19, 55, 0.85)' },
];

// Helper para capturar clique no mapa
function MapEventsHandler({
  onMapClick,
  onZoomChange,
}: {
  onMapClick: (lat: number, lng: number) => void;
  onZoomChange?: (zoom: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    zoomend() {
      if (onZoomChange) {
        onZoomChange(map.getZoom());
      }
    },
  });
  return null;
}

// Helper para recentralização suave
function MapFlyController({
  targetCoord,
  zoom,
}: {
  targetCoord: [number, number] | null;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (targetCoord && map) {
      map.flyTo(targetCoord, zoom || Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.5,
      });
    }
  }, [targetCoord, zoom, map]);
  return null;
}

export default function LocalidadesTab() {
  const { funcionario } = useAuthStore();
  const { localidades, loading, recarregar, invalidarCache } = useLocalidades(false);

  // Estados de navegação do mapa
  const [mapZoom, setMapZoom] = useState<number>(14);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [flyZoom, setFlyZoom] = useState<number>(15);

  // Busca por CEP e endereço
  const [cepBusca, setCepBusca] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [termoBuscaMapa, setTermoBuscaMapa] = useState('');
  const [isSearchingEndereco, setIsSearchingEndereco] = useState(false);
  const abortCtrlRef = useRef<AbortController | null>(null);

  // Estados de Edição/Criação
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Formulário do Canvas Editor
  const [formData, setFormData] = useState<{
    nome: string;
    descricao: string;
    tipo: TipoLocalidade;
    latitude: number;
    longitude: number;
    cep: string;
    tamanho_fonte: number;
    cor_texto: string;
    cor_fundo: string;
    peso_fonte: PesoFonteLocalidade;
    min_zoom: number;
    prioridade: number;
    ativo: boolean;
  }>({
    nome: '',
    descricao: '',
    tipo: 'RURAL',
    latitude: SAPEACU_LAT,
    longitude: SAPEACU_LNG,
    cep: '',
    tamanho_fonte: 14,
    cor_texto: '#ffffff',
    cor_fundo: 'rgba(15, 23, 42, 0.85)',
    peso_fonte: 'bold',
    min_zoom: 12,
    prioridade: 1,
    ativo: true,
  });

  // Filtros da Tabela
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [desativarAnticolisao, setDesativarAnticolisao] = useState(false);

  const markerRef = useRef<L.Marker>(null);

  // Ícone Customizado do Marcador de Edição / Criação (L.divIcon SVG moderno, previne imagem quebrada)
  const iconeMarcadorEdicao = useMemo(() => {
    const iconeEmoji = ICONES_TIPO_LOCALIDADE[formData.tipo] || '📍';
    return L.divIcon({
      className: 'custom-localidade-edit-marker',
      html: `
        <div style="position: relative; width: 44px; height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; cursor: grab;">
          <!-- Pulso de radar / precisão na base do ponto -->
          <div style="position: absolute; bottom: 0px; width: 24px; height: 12px; border-radius: 50%; background: rgba(245, 158, 11, 0.45); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          
          <!-- Pino estilizado com gradiente moderno e sombra -->
          <div style="position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.6));">
            <div style="width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: linear-gradient(135deg, #f59e0b, #d97706); border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.6);">
              <div style="transform: rotate(45deg); font-size: 16px; display: flex; align-items: center; justify-content: center;">
                ${iconeEmoji}
              </div>
            </div>
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #0f172a; border: 2px solid #ffffff; margin-top: -2px; z-index: 5;"></div>
          </div>
        </div>
      `,
      iconSize: [44, 48],
      iconAnchor: [22, 46], // Ancoragem exata na ponta do pino
      popupAnchor: [0, -46],
    });
  }, [formData.tipo]);

  // Manipulador de arraste do marcador de edição
  const dragMarkerHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setFormData((prev) => ({
            ...prev,
            latitude: Number(newPos.lat.toFixed(7)),
            longitude: Number(newPos.lng.toFixed(7)),
          }));
        }
      },
    }),
    []
  );

  // Iniciar nova localidade
  const handleNovaLocalidade = () => {
    setIsEditing(true);
    setSelectedId(null);
    setFormData({
      nome: '',
      descricao: '',
      tipo: 'RURAL',
      latitude: SAPEACU_LAT,
      longitude: SAPEACU_LNG,
      cep: '',
      tamanho_fonte: 14,
      cor_texto: '#ffffff',
      cor_fundo: 'rgba(15, 23, 42, 0.85)',
      peso_fonte: 'bold',
      min_zoom: 12,
      prioridade: 1,
      ativo: true,
    });
    setFlyTarget([SAPEACU_LAT, SAPEACU_LNG]);
    setFlyZoom(14);
  };

  // Carregar localidade para edição
  const handleEditarLocalidade = (loc: Localidade) => {
    setIsEditing(true);
    setSelectedId(loc.id);
    setFormData({
      nome: loc.nome,
      descricao: loc.descricao || '',
      tipo: loc.tipo,
      latitude: loc.latitude,
      longitude: loc.longitude,
      cep: loc.cep || '',
      tamanho_fonte: loc.tamanho_fonte || 14,
      cor_texto: loc.cor_texto || '#ffffff',
      cor_fundo: loc.cor_fundo || 'rgba(15, 23, 42, 0.85)',
      peso_fonte: loc.peso_fonte || 'bold',
      min_zoom: loc.min_zoom || 12,
      prioridade: loc.prioridade || 1,
      ativo: loc.ativo !== false,
    });
    setFlyTarget([loc.latitude, loc.longitude]);
    setFlyZoom(Math.max(mapZoom, loc.min_zoom, 15));
  };

  // Cancelar formulário de edição
  const handleCancelarEdicao = () => {
    setIsEditing(false);
    setSelectedId(null);
  };

  // Clique no mapa para posicionar marcador
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!isEditing) {
      // Se não estiver editando, abre o editor diretamente no ponto clicado
      setIsEditing(true);
      setSelectedId(null);
      setFormData((prev) => ({
        ...prev,
        latitude: Number(lat.toFixed(7)),
        longitude: Number(lng.toFixed(7)),
      }));
      toast.info('Ponto selecionado no mapa. Digite o nome da localidade para salvar.');
    } else {
      setFormData((prev) => ({
        ...prev,
        latitude: Number(lat.toFixed(7)),
        longitude: Number(lng.toFixed(7)),
      }));
    }
  }, [isEditing]);

  // Salvar no Supabase
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error('Informe o nome da localidade.');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error('Selecione um ponto válido no mapa para obter as coordenadas.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: LocalidadeInsert & { id?: string } = {
        ...(selectedId ? { id: selectedId } : {}),
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        tipo: formData.tipo,
        latitude: formData.latitude,
        longitude: formData.longitude,
        cep: formData.cep.trim() || null,
        tamanho_fonte: formData.tamanho_fonte,
        cor_texto: formData.cor_texto,
        cor_fundo: formData.cor_fundo,
        peso_fonte: formData.peso_fonte,
        min_zoom: formData.min_zoom,
        prioridade: formData.prioridade,
        ativo: formData.ativo,
      };

      await salvarLocalidade(payload, funcionario?.id);
      await invalidarCache();

      toast.success(
        selectedId
          ? `Localidade "${formData.nome}" atualizada com sucesso!`
          : `Localidade "${formData.nome}" criada com sucesso!`
      );

      setIsEditing(false);
      setSelectedId(null);
    } catch (err: any) {
      console.error('Erro ao salvar localidade:', err);
      toast.error(`Erro ao salvar: ${err.message || 'Falha na comunicação com o banco'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir localidade
  const handleExcluir = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir a localidade "${nome}"?`)) return;

    setIsDeleting(id);
    try {
      await excluirLocalidade(id);
      await invalidarCache();
      if (selectedId === id) {
        setIsEditing(false);
        setSelectedId(null);
      }
      toast.success(`Localidade "${nome}" excluída com sucesso.`);
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      toast.error(`Erro ao excluir: ${err.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  // Alternar ativo/inativo
  const handleToggleAtivo = async (id: string, currentAtivo: boolean, nome: string) => {
    try {
      const newAtivo = !currentAtivo;
      await alternarStatusLocalidade(id, newAtivo);
      await invalidarCache();
      toast.success(`Localidade "${nome}" ${newAtivo ? 'ativada' : 'desativada'} no mapa.`);
    } catch (err: any) {
      console.error('Erro ao alternar status:', err);
      toast.error(`Erro ao atualizar status: ${err.message}`);
    }
  };

  // Busca por CEP
  const handleBuscarCep = async () => {
    const rawCep = cepBusca.replace(/\D/g, '');
    if (rawCep.length !== 8) {
      toast.warning('Digite um CEP válido com 8 dígitos (ex: 44530-000).');
      return;
    }

    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        toast.error('CEP não encontrado nos Correios.');
        return;
      }

      // Geocodifica o logradouro retornado ou a cidade
      const queryGeo = data.logradouro
        ? `${data.logradouro}, ${data.bairro || ''}, ${data.localidade || 'Sapeaçu'}, ${data.uf || 'BA'}`
        : `${data.localidade || 'Sapeaçu'}, ${data.uf || 'BA'}`;

      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          queryGeo
        )}`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const geoData = await geoRes.json();

      if (geoData && geoData.length > 0) {
        const lat = parseFloat(geoData[0].lat);
        const lng = parseFloat(geoData[0].lon);

        setFormData((prev) => ({
          ...prev,
          cep: rawCep,
          latitude: lat,
          longitude: lng,
          nome: prev.nome || data.bairro || data.logradouro || '',
        }));

        setFlyTarget([lat, lng]);
        setFlyZoom(16);

        if (rawCep === '44530000') {
          toast.info(
            'O CEP 44530-000 abrange todo o município. Clique no mapa ou arraste o pino para refinar a localização exata da localidade rural.'
          );
        } else {
          toast.success(`Coordenadas do CEP localizadas: ${data.localidade || 'Sapeaçu'} - ${data.uf || 'BA'}`);
        }
      } else {
        toast.warning('Endereço do CEP encontrado, mas coordenadas não retornadas. Posicione manualmente no mapa.');
      }
    } catch (err: any) {
      console.error('Erro ao consultar CEP:', err);
      toast.error('Falha ao consultar CEP.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Busca por Termo / Endereço com AbortController
  const handleBuscarEndereco = async () => {
    if (!termoBuscaMapa.trim()) return;

    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    setIsSearchingEndereco(true);
    try {
      let termoFinal = termoBuscaMapa.trim();
      if (!termoFinal.toLowerCase().includes('sapeaçu') && !termoFinal.toLowerCase().includes('sapeacu')) {
        termoFinal = `${termoFinal}, Sapeaçu, Bahia`;
      }

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          termoFinal
        )}`,
        { headers: { 'Accept-Language': 'pt-BR' }, signal: ctrl.signal }
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);

        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));

        setFlyTarget([lat, lng]);
        setFlyZoom(16);
        toast.success(`Localizado no mapa: ${data[0].display_name.split(',')[0]}`);
      } else {
        toast.warning('Local não encontrado. Tente buscar com outro nome ou clique diretamente no mapa.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Erro na busca de endereço:', err);
      toast.error('Erro ao buscar localização.');
    } finally {
      setIsSearchingEndereco(false);
    }
  };

  // Filtragem da lista de localidades
  const localidadesFiltradas = useMemo(() => {
    return localidades.filter((l) => {
      if (filtroTipo !== 'TODOS' && l.tipo !== filtroTipo) return false;
      if (!filtroTexto.trim()) return true;
      const term = filtroTexto.toLowerCase();
      return (
        l.nome.toLowerCase().includes(term) ||
        (l.descricao && l.descricao.toLowerCase().includes(term)) ||
        (l.cep && l.cep.includes(term))
      );
    });
  }, [localidades, filtroTipo, filtroTexto]);

  return (
    <div className="space-y-6">
      {/* ── Header da Aba ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-borderCustom p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400">
              <MapPin className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-foregroundCustom">
              Localidades &amp; Mapeamento Territorial
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/15 dark:text-[#3ea6ff] border border-[#185FA5]/20">
              {localidades.length} {localidades.length === 1 ? 'cadastrada' : 'cadastradas'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Mapeie comunidades rurais, povoados e distritos. Os nomes cadastrados serão exibidos dinamicamente nos mapas de endereços de alunos, funcionários e rotas com detecção automática de anticolisão por zoom.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={handleNovaLocalidade}
            className="bg-highlight text-background hover:bg-highlight/90 font-bold text-xs gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Adicionar Localidade
          </Button>
        </div>
      </div>

      {/* ── Grid Principal: Mapa Interativo + Painel Lateral de Edição / Canvas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Mapa Interativo (7 colunas em telas grandes) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Barra de Busca de Localização & Ferramentas do Mapa */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-card border border-borderCustom p-3 rounded-xl shadow-xs">
            {/* Busca por Endereço */}
            <div className="sm:col-span-7 flex gap-1.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar localidade ou ponto (ex: Murici)..."
                  value={termoBuscaMapa}
                  onChange={(e) => setTermoBuscaMapa(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscarEndereco()}
                  className="h-8 pl-8 text-xs bg-background border-borderCustom"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isSearchingEndereco}
                onClick={handleBuscarEndereco}
                className="h-8 text-xs font-semibold shrink-0"
              >
                {isSearchingEndereco ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ir'}
              </Button>
            </div>

            {/* Busca por CEP */}
            <div className="sm:col-span-5 flex gap-1.5">
              <Input
                type="text"
                placeholder="CEP 00000-000"
                value={cepBusca}
                onChange={(e) => setCepBusca(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscarCep()}
                className="h-8 text-xs bg-background border-borderCustom font-mono"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isSearchingCep}
                onClick={handleBuscarCep}
                className="h-8 text-xs font-semibold shrink-0 border-borderCustom"
              >
                {isSearchingCep ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'CEP'}
              </Button>
            </div>
          </div>

          {/* Container do Mapa Leaflet */}
          <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-borderCustom bg-muted/40 shadow-md">
            <MapContainer
              center={[SAPEACU_LAT, SAPEACU_LNG]}
              zoom={mapZoom}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Google Satélite (Híbrido)">
                  <TileLayer
                    attribution="&copy; Google Maps"
                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                    maxZoom={20}
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Mapa de Ruas (OpenStreetMap)">
                  <TileLayer
                    attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                </LayersControl.BaseLayer>
              </LayersControl>

              {/* Rótulos Dinâmicos com Motor Anticolisão */}
              <LocalidadesLayer
                localidadesCustom={localidades}
                highlightId={selectedId}
                desativarAnticolisao={desativarAnticolisao}
                onSelectLocalidade={(loc) => handleEditarLocalidade(loc)}
              />

              {/* Marcador de Edição Ativo (Arrastável) */}
              {isEditing && (
                <Marker
                  position={[formData.latitude, formData.longitude]}
                  icon={iconeMarcadorEdicao}
                  draggable={true}
                  eventHandlers={dragMarkerHandlers}
                  ref={markerRef}
                />
              )}

              <MapEventsHandler
                onMapClick={handleMapClick}
                onZoomChange={(z) => setMapZoom(z)}
              />

              <MapFlyController targetCoord={flyTarget} zoom={flyZoom} />
            </MapContainer>

            {/* Barra Flutuante de Indicador de Zoom & Controles de Camada */}
            <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-slate-200 text-xs shadow-lg">
              <span className="flex items-center gap-1 font-mono font-bold text-amber-400">
                <ZoomIn className="w-3.5 h-3.5" /> Zoom: {mapZoom}
              </span>
              <span className="text-slate-500">|</span>
              <button
                type="button"
                onClick={() => setDesativarAnticolisao((prev) => !prev)}
                className={cn(
                  'text-[11px] font-semibold transition-colors cursor-pointer',
                  desativarAnticolisao ? 'text-rose-400 underline' : 'text-slate-300 hover:text-white'
                )}
                title="Alternar filtro de sobreposição de textos"
              >
                {desativarAnticolisao ? 'Anticolisão Desativada' : 'Anticolisão Ativa'}
              </button>
              <span className="text-slate-500">|</span>
              <button
                type="button"
                onClick={() => {
                  setFlyTarget([SAPEACU_LAT, SAPEACU_LNG]);
                  setFlyZoom(14);
                }}
                className="text-[11px] text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Navigation className="w-3 h-3" /> Sapeaçu
              </button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
            <HelpCircle className="w-3.5 h-3.5 text-highlight shrink-0" />
            <span>
              <strong>Dica de Mapeamento:</strong> Clique diretamente no mapa para posicionar uma localidade ou arraste o pino com o botão esquerdo do mouse.
            </span>
          </p>
        </div>

        {/* Painel Lateral de Edição / Canvas & Preview (5 colunas em telas grandes) */}
        <div className="lg:col-span-5 space-y-4">
          {isEditing ? (
            <Card
              className="p-5 border-borderCustom bg-card shadow-md space-y-4 animate-in fade-in-50 duration-200"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-borderCustom pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-highlight/10 text-highlight">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foregroundCustom">
                      {selectedId ? 'Editar Localidade' : 'Cadastrar Nova Localidade'}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Personalize nome, tipografia e visibilidade no mapa
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelarEdicao}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                  title="Fechar formulário"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSalvar} className="space-y-4">
                {/* 1. Nome da Localidade */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foregroundCustom">Nome da Localidade *</Label>
                  <Input
                    type="text"
                    required
                    placeholder="Ex: Murici, Baixa da Palmeira, Quiambó..."
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="h-9 text-xs bg-background border-borderCustom font-medium"
                  />
                </div>

                {/* 2. Tipo de Localidade & CEP */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foregroundCustom">Tipo Territorial</Label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoLocalidade })}
                      className="w-full h-9 px-2.5 rounded-md bg-background border border-borderCustom text-xs text-foregroundCustom outline-none focus:ring-1 focus:ring-highlight"
                    >
                      <option value="RURAL">🌾 Zona Rural</option>
                      <option value="POVOADO">🏘️ Povoado</option>
                      <option value="DISTRITO">🏛️ Distrito</option>
                      <option value="ASSENTAMENTO">🚜 Assentamento</option>
                      <option value="QUILOMBO">🛖 Quilombola</option>
                      <option value="URBANA">🏢 Área Urbana</option>
                      <option value="OUTRO">📍 Outro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foregroundCustom">CEP (Opcional)</Label>
                    <Input
                      type="text"
                      placeholder="44530-000"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      className="h-9 text-xs bg-background border-borderCustom font-mono"
                    />
                  </div>
                </div>

                {/* 3. Coordenadas GPS */}
                <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl border border-borderCustom/60">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Latitude</span>
                    <Input
                      type="number"
                      step="any"
                      required
                      value={formData.latitude}
                      onChange={(e) =>
                        setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })
                      }
                      className="h-7 text-xs bg-background border-borderCustom font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Longitude</span>
                    <Input
                      type="number"
                      step="any"
                      required
                      value={formData.longitude}
                      onChange={(e) =>
                        setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })
                      }
                      className="h-7 text-xs bg-background border-borderCustom font-mono"
                    />
                  </div>
                </div>

                {/* 4. Canvas Styling: Tamanho de Fonte, Cores & Peso */}
                <div className="space-y-3 pt-2 border-t border-borderCustom">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foregroundCustom flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-highlight" />
                      Tipografia &amp; Tamanho (Canvas)
                    </span>
                    <span className="text-xs font-mono font-bold text-highlight px-2 py-0.5 rounded-md bg-highlight/10">
                      {formData.tamanho_fonte}px
                    </span>
                  </div>

                  {/* Slider de Tamanho de Fonte */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min={10}
                      max={24}
                      step={1}
                      value={formData.tamanho_fonte}
                      onChange={(e) =>
                        setFormData({ ...formData, tamanho_fonte: parseInt(e.target.value, 10) })
                      }
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#185FA5] dark:accent-[#3ea6ff]"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>10px (Compacto)</span>
                      <span>14px (Padrão)</span>
                      <span>18px (Médio)</span>
                      <span>24px (Destaque)</span>
                    </div>
                  </div>

                  {/* Paleta de Cores do Texto */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Cor do Texto</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PALETA_CORES_TEXTO.map((c) => (
                        <button
                          key={c.valor}
                          type="button"
                          onClick={() => setFormData({ ...formData, cor_texto: c.valor })}
                          className={cn(
                            'w-6 h-6 rounded-full border transition-all cursor-pointer flex items-center justify-center',
                            formData.cor_texto === c.valor
                              ? 'ring-2 ring-highlight ring-offset-2 ring-offset-background scale-110'
                              : 'border-borderCustom hover:scale-105'
                          )}
                          style={{ backgroundColor: c.valor }}
                          title={c.label}
                        >
                          {formData.cor_texto === c.valor && (
                            <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cor de Fundo do Badge */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Estilo do Badge (Fundo)</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PALETA_CORES_FUNDO.map((c) => (
                        <button
                          key={c.valor}
                          type="button"
                          onClick={() => setFormData({ ...formData, cor_fundo: c.valor })}
                          className={cn(
                            'w-6 h-6 rounded-md border transition-all cursor-pointer flex items-center justify-center',
                            formData.cor_fundo === c.valor
                              ? 'ring-2 ring-highlight ring-offset-2 ring-offset-background scale-110'
                              : 'border-borderCustom hover:scale-105'
                          )}
                          style={{ backgroundColor: c.valor }}
                          title={c.label}
                        >
                          {formData.cor_fundo === c.valor && (
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Peso da Fonte */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {(['normal', 'semibold', 'bold'] as PesoFonteLocalidade[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, peso_fonte: p })}
                        className={cn(
                          'text-xs py-1.5 rounded-lg border font-medium transition-all capitalize',
                          formData.peso_fonte === p
                            ? 'bg-highlight/15 text-highlight border-highlight/40 font-bold'
                            : 'bg-background border-borderCustom text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {p === 'normal' ? 'Normal' : p === 'semibold' ? 'Semibold' : 'Negrito'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Regras de Zoom & Prioridade */}
                <div className="space-y-3 pt-2 border-t border-borderCustom">
                  <span className="text-xs font-bold text-foregroundCustom flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-highlight" />
                    Regras de Zoom &amp; Prioridade Anticolisão
                  </span>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Zoom Mínimo de Exibição</span>
                      <span className="font-mono font-bold text-foregroundCustom">Nível {formData.min_zoom}</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={17}
                      step={1}
                      value={formData.min_zoom}
                      onChange={(e) =>
                        setFormData({ ...formData, min_zoom: parseInt(e.target.value, 10) })
                      }
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>10 (Panorâmico)</span>
                      <span>12 (Regional)</span>
                      <span>15 (Próximo)</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Prioridade de Exibição (Anticolisão)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: 1, label: '1 (Alta / Principal)' },
                        { val: 2, label: '2 (Média)' },
                        { val: 3, label: '3 (Detalhada)' },
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setFormData({ ...formData, prioridade: p.val })}
                          className={cn(
                            'text-[11px] py-1 px-1.5 rounded-lg border font-semibold transition-all',
                            formData.prioridade === p.val
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                              : 'bg-background border-borderCustom text-muted-foreground'
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 6. Live Canvas Preview Box */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Live Preview do Rótulo no Mapa:
                  </span>
                  <div className="h-16 flex items-center justify-center bg-[#101726] rounded-lg p-2 overflow-hidden border border-slate-800">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg backdrop-blur-md shadow-lg border border-white/20 select-none transition-all"
                      style={{
                        backgroundColor: formData.cor_fundo,
                        color: formData.cor_texto,
                        fontSize: `${formData.tamanho_fonte}px`,
                        fontWeight:
                          formData.peso_fonte === 'normal'
                            ? '400'
                            : formData.peso_fonte === 'semibold'
                            ? '600'
                            : '700',
                        lineHeight: 1.2,
                        textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      <span style={{ fontSize: `${Math.max(11, formData.tamanho_fonte - 2)}px` }}>
                        {ICONES_TIPO_LOCALIDADE[formData.tipo]}
                      </span>
                      <span>{formData.nome.trim() || 'Nome da Localidade'}</span>
                    </div>
                  </div>
                </div>

                {/* Ações do Formulário */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderCustom">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelarEdicao}
                    disabled={isSaving}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving}
                    className="bg-highlight text-background hover:bg-highlight/90 font-bold text-xs gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Salvar Localidade
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            /* Painel de Apresentação / Empty State do Editor */
            <Card className="p-6 border-borderCustom bg-card shadow-sm text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-highlight/10 text-highlight flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-foregroundCustom text-base">
                  Mapeador Territorial Ativo
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Clique em qualquer ponto do mapa ao lado ou use o botão abaixo para cadastrar uma localidade rural ou urbana.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleNovaLocalidade}
                className="bg-highlight text-background hover:bg-highlight/90 font-bold text-xs gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Nova Localidade
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* ── Tabela de Gestão de Localidades Cadastradas ── */}
      <Card className="border-borderCustom bg-card p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borderCustom pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-highlight" />
            <h3 className="font-bold text-base text-foregroundCustom">
              Inventário de Localidades Cadastradas ({localidadesFiltradas.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro por Texto */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Filtrar por nome..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="h-8 pl-8 text-xs bg-background border-borderCustom w-40 sm:w-48"
              />
            </div>

            {/* Filtro por Tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="h-8 px-2.5 rounded-md bg-background border border-borderCustom text-xs text-foregroundCustom outline-none cursor-pointer"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="RURAL">🌾 Rurais</option>
              <option value="POVOADO">🏘️ Povoados</option>
              <option value="DISTRITO">🏛️ Distritos</option>
              <option value="ASSENTAMENTO">🚜 Assentamentos</option>
              <option value="QUILOMBO">🛖 Quilombolas</option>
              <option value="URBANA">🏢 Urbanas</option>
            </select>
          </div>
        </div>

        {/* Listagem em Cards Responsivos */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-highlight" />
            Carregando localidades do sistema...
          </div>
        ) : localidadesFiltradas.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-xs space-y-2">
            <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="font-semibold text-foregroundCustom">Nenhuma localidade encontrada</p>
            <p className="text-[11px]">
              {filtroTexto || filtroTipo !== 'TODOS'
                ? 'Tente remover os filtros de busca acima.'
                : 'Clique no mapa ou em "Adicionar Localidade" para iniciar o mapeamento.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {localidadesFiltradas.map((loc) => {
              const isCurrentEditing = selectedId === loc.id;
              return (
                <div
                  key={loc.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 bg-background/80',
                    isCurrentEditing
                      ? 'border-highlight ring-1 ring-highlight/40 bg-highlight/5'
                      : loc.ativo
                      ? 'border-borderCustom hover:border-foreground/30'
                      : 'border-borderCustom/60 opacity-60'
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0">{ICONES_TIPO_LOCALIDADE[loc.tipo]}</span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-foregroundCustom truncate" title={loc.nome}>
                            {loc.nome}
                          </h4>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider">
                            {ROTULOS_TIPO_LOCALIDADE[loc.tipo]}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                            loc.ativo
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25'
                          )}
                        >
                          {loc.ativo ? 'Ativo' : 'Oculto'}
                        </span>
                      </div>
                    </div>

                    {/* Badge Visual Real */}
                    <div className="pt-1">
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs border border-white/20 select-none shadow-xs"
                        style={{
                          backgroundColor: loc.cor_fundo,
                          color: loc.cor_texto,
                          fontSize: `${Math.min(13, loc.tamanho_fonte)}px`,
                          fontWeight:
                            loc.peso_fonte === 'normal'
                              ? '400'
                              : loc.peso_fonte === 'semibold'
                              ? '600'
                              : '700',
                        }}
                      >
                        <span>{ICONES_TIPO_LOCALIDADE[loc.tipo]}</span>
                        <span>{loc.nome}</span>
                      </div>
                    </div>

                    {/* Informações de Zoom e Coordenadas */}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono pt-1">
                      <span>Zoom min: {loc.min_zoom}</span>
                      <span>•</span>
                      <span>Prioridade: {loc.prioridade}</span>
                      <span>•</span>
                      <span>Fonte: {loc.tamanho_fonte}px</span>
                    </div>

                    {loc.descricao && (
                      <p className="text-[11px] text-muted-foreground/80 line-clamp-2">
                        {loc.descricao}
                      </p>
                    )}
                  </div>

                  {/* Ações da Linha */}
                  <div className="flex items-center justify-between pt-2 border-t border-borderCustom/60">
                    <button
                      type="button"
                      onClick={() => {
                        setFlyTarget([loc.latitude, loc.longitude]);
                        setFlyZoom(Math.max(mapZoom, loc.min_zoom, 16));
                      }}
                      className="text-xs font-semibold text-[#185FA5] dark:text-[#3ea6ff] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Centralizar no mapa"
                    >
                      <Navigation className="w-3 h-3" /> Ver no Mapa
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleAtivo(loc.id, loc.ativo, loc.nome)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title={loc.ativo ? 'Desativar no mapa' : 'Ativar no mapa'}
                      >
                        {loc.ativo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditarLocalidade(loc)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Editar configurações visuais"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={isDeleting === loc.id}
                        onClick={() => handleExcluir(loc.id, loc.nome)}
                        className="p-1.5 rounded-md text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                        title="Excluir localidade"
                      >
                        {isDeleting === loc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
