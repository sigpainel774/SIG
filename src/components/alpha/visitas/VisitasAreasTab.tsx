'use client';

import React, { useState } from 'react';
import { VisitasArea } from '@/types/visitas';
import { formatarArea } from '@/lib/visitas/areaCalculator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Pentagon,
  Search,
  Plus,
  Edit3,
  Trash2,
  MapPin,
  Maximize2,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface VisitasAreasTabProps {
  areas: VisitasArea[];
  onNewArea: () => void;
  onEditArea: (area: VisitasArea) => void;
  onDeleteArea: (areaId: string) => void;
  onSelectAreaOnMap: (area: VisitasArea) => void;
}

export function VisitasAreasTab({
  areas = [],
  onNewArea,
  onEditArea,
  onDeleteArea,
  onSelectAreaOnMap,
}: VisitasAreasTabProps) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const areasAtivas = areas.filter((a) => !a.deleted_at);

  const areasFiltradas = areasAtivas.filter((a) => {
    const matchesBusca =
      a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (a.descricao ?? '').toLowerCase().includes(busca.toLowerCase());
    const matchesStatus = filtroStatus === 'todos' || a.status === filtroStatus;
    return matchesBusca && matchesStatus;
  });

  const totalM2 = areasAtivas.reduce((acc, a) => acc + (a.square_meters || 0), 0);
  const totalHectares = totalM2 / 10000;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Cards de Indicadores de Áreas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-sidebar-border p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Áreas Cadastradas
            </span>
            <div className="text-2xl font-bold text-sidebar-foreground mt-1">
              {areasAtivas.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sidebar-accent text-sidebar-primary flex items-center justify-center">
            <Pentagon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-sidebar-border p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Extensão Total Mapeada
            </span>
            <div className="text-2xl font-bold text-sidebar-foreground mt-1 font-mono">
              {totalHectares.toFixed(2)} ha
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <Maximize2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-sidebar-border p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Áreas Concluídas
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {areasAtivas.filter((a) => a.status === 'concluido').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Filtros e Ação de Nova Área ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-sidebar-border p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou observações..."
              className="h-9 pl-9 text-xs bg-white border-sidebar-border text-sidebar-foreground"
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="h-9 px-3 rounded-xl bg-white border border-sidebar-border text-xs text-sidebar-foreground font-semibold"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>

        <Button
          onClick={onNewArea}
          size="sm"
          className="h-9 text-xs font-bold gap-1.5 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white shadow-xs rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Delimitar Nova Área
        </Button>
      </div>

      {/* ── Grid de Cards de Áreas ── */}
      {areasFiltradas.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-sidebar-border rounded-2xl bg-white space-y-3">
          <Pentagon className="w-10 h-10 text-muted-foreground mx-auto" />
          <div className="text-sm font-semibold text-sidebar-foreground">
            Nenhuma área encontrada
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Utilize o mapa interativo para delimitar os vértices do perímetro da primeira área.
          </p>
          <Button
            onClick={onNewArea}
            size="sm"
            variant="outline"
            className="text-xs font-semibold gap-1.5 mt-2 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <Plus className="w-3.5 h-3.5" />
            Abrir Mapa para Desenhar
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {areasFiltradas.map((area) => (
            <div
              key={area.id}
              className="bg-white border border-sidebar-border rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-sidebar-primary/40 transition-all shadow-xs"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: area.cor || '#3b82f6' }}
                    />
                    <h3 className="font-bold text-sm text-sidebar-foreground line-clamp-1">
                      {area.nome}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold ${
                      area.status === 'concluido'
                        ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                        : area.status === 'em_andamento'
                        ? 'border-blue-200 text-blue-700 bg-blue-50'
                        : 'border-slate-200 text-slate-700 bg-slate-50'
                    }`}
                  >
                    {area.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-sidebar-accent/30 border border-sidebar-border p-2.5 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      Dimensão
                    </span>
                    <strong className="text-sidebar-foreground">
                      {formatarArea(area.square_meters)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      Vértices
                    </span>
                    <strong className="text-sidebar-foreground">
                      {area.vertices?.length ?? 0} pontos
                    </strong>
                  </div>
                </div>

                {area.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">
                    "{area.descricao}"
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-sidebar-border gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSelectAreaOnMap(area)}
                  className="h-8 text-xs font-semibold gap-1 text-sidebar-primary hover:text-sidebar-primary hover:bg-sidebar-accent/50 px-2 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Ver no Mapa
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditArea(area)}
                    className="h-8 w-8 p-0 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/50 cursor-pointer"
                    title="Editar Área"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDeleteArea(area.id)}
                    className="h-8 w-8 p-0 cursor-pointer"
                    title="Excluir Área"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
