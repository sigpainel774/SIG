'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StandardDialog } from '@/components/ui/standard-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Trash2,
  HardDrive,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  XCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  visitasMapTileCacheService,
  OfflineMapPackage,
  DownloadProgress,
  calcularTilesParaBounds,
} from '@/lib/visitas/visitasMapTileCacheService';
import { toast } from 'sonner';

interface VisitasDownloadMapaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMapCenter?: [number, number]; // [lat, lng]
}

// Limites geográficos padrão de Sapeaçu-BA
const SAPEACU_BOUNDS = {
  minLat: -12.775,
  minLng: -39.26,
  maxLat: -12.67,
  maxLng: -39.14,
};

export function VisitasDownloadMapaModal({
  open,
  onOpenChange,
  currentMapCenter = [-12.7214, -39.1989],
}: VisitasDownloadMapaModalProps) {
  const [activeTab, setActiveTab] = useState<'baixar' | 'gerenciar'>('baixar');
  const [tipoArea, setTipoArea] = useState<'municipio' | 'raio_atual'>('municipio');
  const [nomePacote, setNomePacote] = useState('Mapa Sapeaçu - Campo');
  const [nivelZoom, setNivelZoom] = useState<'basico' | 'padrao' | 'alto'>('padrao');

  // Estados de download
  const [progresso, setProgresso] = useState<DownloadProgress | null>(null);
  const [baixando, setBaixando] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Estados de gerenciamento
  const [pacotes, setPacotes] = useState<OfflineMapPackage[]>([]);
  const [usoCache, setUsoCache] = useState<{ totalTilesNoCache: number; tamanhoEstimadoMb: number }>({
    totalTilesNoCache: 0,
    tamanhoEstimadoMb: 0,
  });

  // Range de zoom conforme o nível selecionado
  const zoomConfig = useMemo(() => {
    switch (nivelZoom) {
      case 'basico':
        return { minZoom: 13, maxZoom: 15, label: 'Visão Geral (Zooms 13-15)' };
      case 'padrao':
        return { minZoom: 13, maxZoom: 16, label: 'Padrão de Campo (Zooms 13-16)' };
      case 'alto':
        return { minZoom: 13, maxZoom: 17, label: 'Alta Resolução / Quadras (Zooms 13-17)' };
    }
  }, [nivelZoom]);

  // Bounds calculados
  const boundsAtuais = useMemo(() => {
    if (tipoArea === 'municipio') {
      return SAPEACU_BOUNDS;
    }
    // Raio ao redor da posição atual (~3km)
    const latDelta = 0.03;
    const lngDelta = 0.03;
    return {
      minLat: currentMapCenter[0] - latDelta,
      minLng: currentMapCenter[1] - lngDelta,
      maxLat: currentMapCenter[0] + latDelta,
      maxLng: currentMapCenter[1] + lngDelta,
    };
  }, [tipoArea, currentMapCenter]);

  // Estimativa de tiles
  const estimativa = useMemo(() => {
    try {
      const tiles = calcularTilesParaBounds(
        boundsAtuais.minLat,
        boundsAtuais.minLng,
        boundsAtuais.maxLat,
        boundsAtuais.maxLng,
        zoomConfig.minZoom,
        zoomConfig.maxZoom
      );
      const total = tiles.length;
      const mb = Number(((total * 20) / 1024).toFixed(1));
      return { total, mb };
    } catch {
      return { total: 0, mb: 0 };
    }
  }, [boundsAtuais, zoomConfig]);

  const carregarPacotesEUso = async () => {
    const list = await visitasMapTileCacheService.listarPacotes();
    const uso = await visitasMapTileCacheService.obterUsoCache();
    setPacotes(list);
    setUsoCache(uso);
  };

  useEffect(() => {
    if (open) {
      carregarPacotesEUso();
    }
  }, [open]);

  // Iniciar Download
  const handleIniciarDownload = async () => {
    if (!navigator.onLine) {
      toast.error('É necessário estar conectado à internet para baixar novos mapas offline.');
      return;
    }

    setBaixando(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await visitasMapTileCacheService.baixarAreaTiles(
        nomePacote.trim() || 'Pacote de Mapa Offline',
        boundsAtuais.minLat,
        boundsAtuais.minLng,
        boundsAtuais.maxLat,
        boundsAtuais.maxLng,
        zoomConfig.minZoom,
        zoomConfig.maxZoom,
        (prog) => setProgresso(prog),
        controller.signal
      );

      if (res) {
        toast.success('Mapa offline baixado com sucesso! Já está disponível em campo.');
        await carregarPacotesEUso();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error(err?.message || 'Erro ao baixar mapa offline.');
      }
    } finally {
      setBaixando(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelarDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setBaixando(false);
    toast.info('Download de mapa cancelado.');
  };

  const handleExcluirPacote = async (id: string) => {
    await visitasMapTileCacheService.excluirPacote(id);
    toast.success('Pacote removido da lista.');
    await carregarPacotesEUso();
  };

  const handleLimparTodoCache = async () => {
    const confirmou = window.confirm(
      'Deseja apagar todos os mapas e quadrículas salvos no dispositivo? Isso liberará espaço de disco.'
    );
    if (!confirmou) return;

    await visitasMapTileCacheService.limparTodoCacheTiles();
    toast.success('Cache de mapas offline limpo com sucesso.');
    await carregarPacotesEUso();
  };

  return (
    <StandardDialog
      open={open}
      onOpenChange={(val) => {
        if (!baixando) onOpenChange(val);
      }}
      title="Mapas para Uso Offline (Campo)"
      description="Baixe quadrículas do mapa com antecedência para navegar e registrar visitas sem sinal de internet."
      className="sm:max-w-[560px]"
    >
      <div className="space-y-4 pt-2">
        {/* Abas de Navegação */}
        <div className="flex rounded-xl bg-muted/60 p-1 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('baixar')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'baixar'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Baixar Novo Pacote
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gerenciar')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'gerenciar'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Gerenciar Armazenamento ({pacotes.length})
          </button>
        </div>

        {activeTab === 'baixar' ? (
          <div className="space-y-4">
            {/* Nome do Pacote */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Nome do Pacote</Label>
              <Input
                value={nomePacote}
                onChange={(e) => setNomePacote(e.target.value)}
                disabled={baixando}
                placeholder="Ex: Sapeaçu - Zona Rural / Centro"
                className="h-9 text-xs bg-muted/30 border-border"
              />
            </div>

            {/* Seleção de Área */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Área de Cobertura</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={baixando}
                  onClick={() => {
                    setTipoArea('municipio');
                    setNomePacote('Mapa Sapeaçu - Município Completo');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tipoArea === 'municipio'
                      ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                      : 'border-border bg-muted/20 text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    Município Completo
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Sapeaçu-BA e entorno rural
                  </div>
                </button>

                <button
                  type="button"
                  disabled={baixando}
                  onClick={() => {
                    setTipoArea('raio_atual');
                    setNomePacote('Mapa Local - Raio 3km');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tipoArea === 'raio_atual'
                      ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                      : 'border-border bg-muted/20 text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Raio da Posição Atual
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Área de ~3km ao redor do cursor
                  </div>
                </button>
              </div>
            </div>

            {/* Nível de Resolução / Zoom */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Nível de Detalhe</Label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['basico', 'padrao', 'alto'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    disabled={baixando}
                    onClick={() => setNivelZoom(lvl)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      nivelZoom === lvl
                        ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-bold'
                        : 'border-border bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    <div className="capitalize font-semibold text-xs text-foreground">
                      {lvl === 'basico' ? 'Básico' : lvl === 'padrao' ? 'Padrão Campo' : 'Alta Definição'}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {lvl === 'basico' ? 'z13-z15' : lvl === 'padrao' ? 'z13-z16' : 'z13-z17'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Caixa de Estimativa */}
            <div className="bg-muted/40 border border-border p-3 rounded-xl flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">
                  Total de Quadrículas
                </span>
                <strong className="text-foreground">{estimativa.total} blocos</strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block font-sans">
                  Espaço Estimado
                </span>
                <strong className="text-emerald-400">~{estimativa.mb} MB</strong>
              </div>
            </div>

            {/* Barra de Progresso durante Download */}
            {progresso && (
              <div className="space-y-2 bg-blue-950/20 border border-blue-900/40 p-3 rounded-xl animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-300 font-semibold flex items-center gap-1.5">
                    {baixando && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                    {progresso.status === 'concluido' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {progresso.status === 'cancelado' && (
                      <XCircle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    {progresso.status === 'erro' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    {progresso.mensagem}
                  </span>
                  <span className="font-mono text-xs text-blue-200">{progresso.percentual}%</span>
                </div>

                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-linear-to-r from-blue-600 to-teal-400 transition-all duration-200"
                    style={{ width: `${progresso.percentual}%` }}
                  />
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center justify-between pt-2">
              {baixando ? (
                <Button
                  size="sm"
                  variant="destructive"
                  type="button"
                  onClick={handleCancelarDownload}
                  className="h-9 text-xs gap-1.5 w-full"
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar Download
                </Button>
              ) : (
                <div className="flex items-center justify-end gap-2 w-full">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="h-9 text-xs"
                  >
                    Fechar
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleIniciarDownload}
                    className="h-9 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <Download className="w-4 h-4" />
                    Iniciar Download Offline
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status do Cache Global */}
            <div className="bg-muted/40 border border-border p-3 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="font-bold text-foreground">Cache Local de Mapas</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {usoCache.totalTilesNoCache} quadrículas armazenadas (~{usoCache.tamanhoEstimadoMb} MB)
                  </div>
                </div>
              </div>

              {usoCache.totalTilesNoCache > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleLimparTodoCache}
                  className="h-7 text-[11px] font-semibold gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpar Tudo
                </Button>
              )}
            </div>

            {/* Lista de Pacotes */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pacotes.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                  Nenhum pacote salvo no dispositivo ainda.
                </div>
              ) : (
                pacotes.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <span>{pkg.nome}</span>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono border-blue-500/30 text-blue-400 bg-blue-500/10"
                        >
                          z{pkg.minZoom}-z{pkg.maxZoom}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {pkg.totalTiles} blocos • {Number((pkg.tamanhoBytes / 1024 / 1024).toFixed(2))} MB • Baixado em{' '}
                        {new Date(pkg.baixadoEm).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExcluirPacote(pkg.id)}
                      className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-950/30"
                      title="Excluir Pacote"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9 text-xs"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
