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
  Layers,
  Crosshair,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CoordinateTuple } from '@/types/visitas';
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
}

export function VisitasDrawingToolbar({
  mode,
  setMode,
  draftVertices,
  onUndoVertex,
  onClearDraft,
  onFinishPolygon,
  onLocateMe,
}: VisitasDrawingToolbarProps) {
  const areaAtualM2 =
    draftVertices.length >= 3
      ? calcularAreaPoligonoMetrosQuadrados(draftVertices)
      : 0;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">
      {/* Modos Principais */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant={mode === 'select' ? 'default' : 'ghost'}
          onClick={() => setMode('select')}
          className={cn(
            'h-8 text-xs font-semibold gap-1.5 rounded-xl',
            mode === 'select'
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
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
            'h-8 text-xs font-semibold gap-1.5 rounded-xl',
            mode === 'draw_polygon'
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
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
            'h-8 text-xs font-semibold gap-1.5 rounded-xl',
            mode === 'add_point'
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
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
            'h-8 text-xs font-semibold gap-1.5 rounded-xl',
            mode === 'measure'
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <Ruler className="w-3.5 h-3.5" />
          Medir
        </Button>
      </div>

      {/* Controles de Desenho de Polígono Ativo */}
      {mode === 'draw_polygon' && draftVertices.length > 0 && (
        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
          <div className="flex flex-col text-[11px] font-mono leading-tight text-slate-700">
            <span className="font-bold text-blue-600">
              {draftVertices.length} vértice(s)
            </span>
            {areaAtualM2 > 0 && <span className="text-slate-600">{formatarArea(areaAtualM2)}</span>}
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onUndoVertex}
            disabled={draftVertices.length === 0}
            className="h-7 px-2 text-xs text-slate-700 border-slate-200 hover:bg-slate-100"
            title="Desfazer último vértice"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClearDraft}
            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            title="Limpar rascunho"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onFinishPolygon}
            disabled={draftVertices.length < 3}
            className="h-7 px-3 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            Concluir Área
          </Button>
        </div>
      )}

      {/* Botão de Localização do Usuário */}
      <div className="flex items-center gap-1.5 ml-auto">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onLocateMe}
          className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          title="Centralizar em minha localização GPS"
        >
          <Crosshair className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden md:inline">Onde estou</span>
        </Button>
      </div>
    </div>
  );
}
