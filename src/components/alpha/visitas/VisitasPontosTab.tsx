'use client';

import React, { useState } from 'react';
import { VisitasPonto, VisitasArea, PontoCategoria } from '@/types/visitas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MapPin,
  Search,
  Plus,
  Edit3,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface VisitasPontosTabProps {
  pontos: VisitasPonto[];
  areas: VisitasArea[];
  onNewPonto: () => void;
  onEditPonto: (ponto: VisitasPonto) => void;
  onDeletePonto: (pontoId: string) => void;
  onSelectPontoOnMap: (ponto: VisitasPonto) => void;
}

const CATEGORIAS_FILTRO = [
  'Todos',
  'Geral',
  'Problema',
  'Observacao',
  'Visita',
  'Imovel',
  'Vegetacao',
  'Outro',
];

export function VisitasPontosTab({
  pontos = [],
  areas = [],
  onNewPonto,
  onEditPonto,
  onDeletePonto,
  onSelectPontoOnMap,
}: VisitasPontosTabProps) {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [statusAtivo, setStatusAtivo] = useState('todos');

  const areaMap = new Map(areas.map((a) => [a.id, a.nome]));
  const pontosAtivos = pontos.filter((p) => !p.deleted_at);

  const pontosFiltrados = pontosAtivos.filter((p) => {
    const matchesBusca =
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.descricao ?? '').toLowerCase().includes(busca.toLowerCase());
    const matchesCat =
      categoriaAtiva === 'Todos' || p.categoria === categoriaAtiva;
    const matchesStatus = statusAtivo === 'todos' || p.status === statusAtivo;
    return matchesBusca && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Barra de Categorias Rápida ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIAS_FILTRO.map((cat) => {
          const count =
            cat === 'Todos'
              ? pontosAtivos.length
              : pontosAtivos.filter((p) => p.categoria === cat).length;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaAtiva(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                categoriaAtiva === cat
                  ? 'bg-sidebar-primary border-sidebar-primary text-white shadow-xs'
                  : 'bg-white border-sidebar-border text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/40'
              }`}
            >
              <span>{cat}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                categoriaAtiva === cat ? 'bg-white/20 text-white' : 'bg-sidebar-accent text-sidebar-accent-foreground'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filtros e Ação de Novo Ponto ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-sidebar-border p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar ponto por nome..."
              className="h-9 pl-9 text-xs bg-white border-sidebar-border text-sidebar-foreground"
            />
          </div>

          <select
            value={statusAtivo}
            onChange={(e) => setStatusAtivo(e.target.value)}
            className="h-9 px-3 rounded-xl bg-white border border-sidebar-border text-xs text-sidebar-foreground font-semibold"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="visitado">Visitado</option>
            <option value="ignorado">Ignorado</option>
          </select>
        </div>

        <Button
          onClick={onNewPonto}
          size="sm"
          className="h-9 text-xs font-bold gap-1.5 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white shadow-xs rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Marcar Novo Ponto
        </Button>
      </div>

      {/* ── Listagem de Cards de Pontos ── */}
      {pontosFiltrados.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-sidebar-border rounded-2xl bg-white space-y-3">
          <MapPin className="w-10 h-10 text-muted-foreground mx-auto" />
          <div className="text-sm font-semibold text-sidebar-foreground">
            Nenhum ponto encontrado
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Cadastre pontos no mapa com o GPS ou clique diretamente nas coordenadas desejadas.
          </p>
          <Button
            onClick={onNewPonto}
            size="sm"
            variant="outline"
            className="text-xs font-semibold gap-1.5 mt-2 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Ponto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pontosFiltrados.map((ponto) => (
            <div
              key={ponto.id}
              className="bg-white border border-sidebar-border rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-sidebar-primary/40 transition-all shadow-xs"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-sidebar-foreground line-clamp-1">
                      {ponto.nome}
                    </h3>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {Number(ponto.latitude).toFixed(5)}, {Number(ponto.longitude).toFixed(5)}
                    </span>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold ${
                      ponto.categoria === 'Problema'
                        ? 'border-rose-200 text-rose-700 bg-rose-50'
                        : ponto.categoria === 'Observacao'
                        ? 'border-amber-200 text-amber-700 bg-amber-50'
                        : 'border-blue-200 text-blue-700 bg-blue-50'
                    }`}
                  >
                    {ponto.categoria}
                  </Badge>
                </div>

                {ponto.area_id && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sidebar-accent text-[11px] text-sidebar-accent-foreground font-medium border border-sidebar-border">
                    <span className="text-muted-foreground">Área:</span>
                    <span className="font-semibold text-sidebar-primary">
                      {areaMap.get(ponto.area_id) ?? 'Área vinculada'}
                    </span>
                  </div>
                )}

                {ponto.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">
                    "{ponto.descricao}"
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-sidebar-border gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSelectPontoOnMap(ponto)}
                  className="h-8 text-xs font-semibold gap-1 text-sidebar-primary hover:text-sidebar-primary hover:bg-sidebar-accent/50 px-2 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Ver no Mapa
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditPonto(ponto)}
                    className="h-8 w-8 p-0 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/50 cursor-pointer"
                    title="Editar Ponto"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDeletePonto(ponto.id)}
                    className="h-8 w-8 p-0 cursor-pointer"
                    title="Excluir Ponto"
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
