'use client';

import React from 'react';
import {
  MousePointer,
  Pentagon,
  MapPin,
  Ruler,
  Undo2,
  Check,
  Trash2,
  Crosshair,
  MapPinPlus,
  X,
  Clock,
  CheckCircle2,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CoordinateTuple, VisitasArea, AreaStatus } from '@/types/visitas';
import { formatarArea, calcularAreaPoligonoMetrosQuadrados } from '@/lib/visitas/areaCalculator';

export type MapInteractionMode = 'select' | 'draw_polygon' | 'add_point' | 'measure';

interface VisitasDrawingToolbarProps {
  mode: MapInteractionMode;
  setMode: (mode: MapInteractionMode) => void;
  draftVertices: CoordinateTuple[];
  onUndoVertex: () => void;
  onClearDraft: () => void;
  onFinishPolygon: () => void;
  onLocateMe: () => void;
  selectedArea?: VisitasArea | null;
  onUpdateAreaStatus?: (areaId: string, status: AreaStatus) => void;
  onClearSelectedArea?: () => void;
  onMarcarVisitaImediata?: () => void;
}

export function VisitasDrawingToolbar({
  mode,
  setMode,
  draftVertices,
  onUndoVertex,
  onClearDraft,
  onFinishPolygon,
  onLocateMe,
  selectedArea,
  onUpdateAreaStatus,
  onClearSelectedArea,
  onMarcarVisitaImediata,
}: VisitasDrawingToolbarProps) {
  const areaAtualM2 =
    draftVertices.length >= 3
      ? calcularAreaPoligonoMetrosQuadrados(draftVertices)
      : 0;

  return (
    <div className="flex flex-col gap-2.5 bg-white border border-sidebar-border p-2.5 rounded-2xl shadow-xs">
      {/* Linha Principal de Modos & Ações */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Modos Principais */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant={mode === 'select' ? 'default' : 'ghost'}
            onClick={() => setMode('select')}
            className={cn(
              'h-8 text-xs font-semibold gap-1.5 rounded-xl cursor-pointer',
              mode === 'select'
                ? 'bg-sidebar-primary hover:bg-sidebar-primary/90 text-white shadow-xs'
                : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
            )}
          >
            <MousePointer className="w-3.5 h-3.5" />
            Navegar
          </Button>

          <Button
            type="button"
            size="sm"
            variant={mode === 'draw_polygon' ? 'default' : 'ghost'}
            onClick={() => setMode('draw_polygon')}
            className={cn(
              'h-8 text-xs font-semibold gap-1.5 rounded-xl cursor-pointer',
              mode === 'draw_polygon'
                ? 'bg-sidebar-primary hover:bg-sidebar-primary/90 text-white shadow-xs'
                : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
            )}
          >
            <Pentagon className="w-3.5 h-3.5" />
            Delimitar Área
          </Button>

          <Button
            type="button"
            size="sm"
            variant={mode === 'add_point' ? 'default' : 'ghost'}
            onClick={() => setMode('add_point')}
            className={cn(
              'h-8 text-xs font-semibold gap-1.5 rounded-xl cursor-pointer',
              mode === 'add_point'
                ? 'bg-sidebar-primary hover:bg-sidebar-primary/90 text-white shadow-xs'
                : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            Marcar Ponto
          </Button>

          <Button
            type="button"
            size="sm"
            variant={mode === 'measure' ? 'default' : 'ghost'}
            onClick={() => setMode('measure')}
            className={cn(
              'h-8 text-xs font-semibold gap-1.5 rounded-xl cursor-pointer',
              mode === 'measure'
                ? 'bg-sidebar-primary hover:bg-sidebar-primary/90 text-white shadow-xs'
                : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
            )}
          >
            <Ruler className="w-3.5 h-3.5" />
            Medir
          </Button>
        </div>

        {/* Ações Rápidas de Campo (Visita Imediata e GPS) */}
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {/* Botão de Marcar Visita Imediata na Coordenada Atual */}
          {onMarcarVisitaImediata && (
            <Button
              type="button"
              size="sm"
              onClick={onMarcarVisitaImediata}
              className="h-8 text-xs font-bold gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95 transition-transform"
              title="Registra uma visita/parada imediata nas suas coordenadas GPS atuais"
            >
              <MapPinPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Marcar Visita Aqui</span>
            </Button>
          )}

          {/* Botão de Localização do Usuário */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onLocateMe}
            className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/60 cursor-pointer shadow-xs"
            title="Centralizar em minha localização GPS"
          >
            <Crosshair className="w-3.5 h-3.5 text-sidebar-primary" />
            <span className="hidden sm:inline">Onde estou</span>
          </Button>
        </div>
      </div>

      {/* ── Painel Flutuante: Área Selecionada no Mapa com Select de Status ── */}
      {selectedArea && onUpdateAreaStatus && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 px-3 rounded-xl bg-sidebar-accent/40 border border-sidebar-border animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: selectedArea.cor || '#3b82f6' }}
            />
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-bold text-sidebar-foreground truncate">
                {selectedArea.nome}
              </span>
              <span className="text-[11px] text-muted-foreground hidden md:inline">
                ({formatarArea(selectedArea.square_meters)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
              Status da Área:
            </span>

            {/* Select Rápido de Estados: Não Iniciado / Em Curso / Concluído */}
            <div className="relative inline-flex items-center">
              <select
                aria-label="Status da Área Delimitada"
                value={selectedArea.status || 'pendente'}
                onChange={(e) =>
                  onUpdateAreaStatus(selectedArea.id, e.target.value as AreaStatus)
                }
                className={cn(
                  'h-7 text-xs font-bold px-2.5 pr-6 rounded-lg border appearance-none cursor-pointer transition-colors outline-hidden',
                  selectedArea.status === 'concluido'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : selectedArea.status === 'em_andamento'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                )}
              >
                <option value="pendente">
                  🟡 Não Iniciado
                </option>
                <option value="em_andamento">
                  🔵 Em Curso
                </option>
                <option value="concluido">
                  🟢 Concluído
                </option>
              </select>
            </div>

            {onClearSelectedArea && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onClearSelectedArea}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-sidebar-foreground cursor-pointer"
                title="Desmarcar área"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Controles de Desenho de Polígono Ativo ── */}
      {mode === 'draw_polygon' && draftVertices.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sidebar-border pt-2">
          <div className="flex items-center gap-2 text-[11px] font-mono leading-tight">
            <span className="font-bold text-sidebar-primary">
              {draftVertices.length} vértice(s) marcado(s)
            </span>
            {areaAtualM2 > 0 && (
              <span className="text-muted-foreground">({formatarArea(areaAtualM2)})</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onUndoVertex}
              disabled={draftVertices.length === 0}
              className="h-7 px-2 text-xs border-sidebar-border hover:bg-sidebar-accent/60 cursor-pointer text-sidebar-foreground"
              title="Desfazer último vértice"
            >
              <Undo2 className="w-3.5 h-3.5 mr-1" />
              Desfazer
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClearDraft}
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
              title="Limpar rascunho"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onFinishPolygon}
              disabled={draftVertices.length < 3}
              className="h-7 px-3 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Concluir Área
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
