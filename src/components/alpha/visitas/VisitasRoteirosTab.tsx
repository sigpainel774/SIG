'use client';

import React, { useState } from 'react';
import {
  VisitasRoteiro,
  VisitasArea,
  VisitasVeiculo,
  RoteiroStatus,
} from '@/types/visitas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StandardDialog } from '@/components/ui/standard-dialog';
import {
  Calendar,
  Car,
  Plus,
  Play,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Pentagon,
  Sparkles,
} from 'lucide-react';
import { formatarArea } from '@/lib/visitas/areaCalculator';
import { toast } from 'sonner';

interface VisitasRoteirosTabProps {
  roteiros: VisitasRoteiro[];
  areas: VisitasArea[];
  veiculos: VisitasVeiculo[];
  onSaveRoteiro: (roteiroData: Partial<VisitasRoteiro>) => Promise<void>;
  onDeleteRoteiro: (roteiroId: string) => Promise<void>;
  onStartTrackingRoteiro: (roteiro: VisitasRoteiro) => void;
}

export function VisitasRoteirosTab({
  roteiros = [],
  areas = [],
  veiculos = [],
  onSaveRoteiro,
  onDeleteRoteiro,
  onStartTrackingRoteiro,
}: VisitasRoteirosTabProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [roteiroEmEdicao, setRoteiroEmEdicao] = useState<Partial<VisitasRoteiro> | null>(null);

  const [nome, setNome] = useState('');
  const [dataPlanejada, setDataPlanejada] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<RoteiroStatus>('planejado');
  const [veiculoId, setVeiculoId] = useState<string>('nenhum');
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  const areaMap = new Map(areas.map((a) => [a.id, a]));
  const veicMap = new Map(veiculos.map((v) => [v.id, v]));

  const abrirModalNovo = () => {
    setRoteiroEmEdicao(null);
    setNome(`Roteiro de Campo - ${new Date().toLocaleDateString('pt-BR')}`);
    setDataPlanejada(new Date().toISOString().split('T')[0]);
    setStatus('planejado');
    setVeiculoId('nenhum');
    setSelectedAreaIds([]);
    setObservacoes('');
    setModalAberto(true);
  };

  const abrirModalEditar = (rot: VisitasRoteiro) => {
    setRoteiroEmEdicao(rot);
    setNome(rot.nome);
    setDataPlanejada(rot.data_planejada);
    setStatus(rot.status);
    setVeiculoId(rot.veiculo_id ?? 'nenhum');
    setSelectedAreaIds(rot.area_ids ?? []);
    setObservacoes(rot.observacoes ?? '');
    setModalAberto(true);
  };

  const toggleAreaSelection = (areaId: string) => {
    setSelectedAreaIds((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Informe um nome para o roteiro.');
      return;
    }

    setSaving(true);
    try {
      await onSaveRoteiro({
        ...roteiroEmEdicao,
        nome: nome.trim(),
        data_planejada: dataPlanejada,
        status,
        veiculo_id: veiculoId === 'nenhum' ? null : veiculoId,
        area_ids: selectedAreaIds,
        observacoes: observacoes.trim() || null,
      });
      setModalAberto(false);
      toast.success('Roteiro salvo com sucesso!');
    } finally {
      setSaving(false);
    }
  };

  const roteirosAtivos = roteiros.filter((r) => !r.deleted_at);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Topo com Ação de Novo Roteiro ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Planejamento Diário de Rotas (Day Planner)
          </h2>
          <p className="text-xs text-muted-foreground">
            Defina quais áreas serão visitadas no dia, associe o veículo e inicie a navegação.
          </p>
        </div>

        <Button
          onClick={abrirModalNovo}
          size="sm"
          className="h-9 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Planejar Novo Dia
        </Button>
      </div>

      {/* ── Grid de Roteiros ── */}
      {roteirosAtivos.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40 space-y-3">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto" />
          <div className="text-sm font-semibold text-foreground">
            Nenhum roteiro planejado
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Crie seu primeiro plano de visitas para organizar o itinerário das equipes em campo.
          </p>
          <Button
            onClick={abrirModalNovo}
            size="sm"
            variant="outline"
            className="text-xs font-semibold gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Criar Primeiro Roteiro
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roteirosAtivos.map((rot) => {
            const veiculo = rot.veiculo_id ? veicMap.get(rot.veiculo_id) : null;
            const areasDoRoteiro = (rot.area_ids || [])
              .map((id) => areaMap.get(id))
              .filter(Boolean) as VisitasArea[];

            return (
              <div
                key={rot.id}
                className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-blue-500/40 transition-all shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {rot.nome}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>
                          {new Date(rot.data_planejada + 'T12:00:00Z').toLocaleDateString(
                            'pt-BR'
                          )}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold ${
                        rot.status === 'finalizado'
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                          : rot.status === 'em_execucao'
                          ? 'border-sky-500/40 text-sky-400 bg-sky-500/10'
                          : 'border-slate-500/40 text-slate-400 bg-slate-500/10'
                      }`}
                    >
                      {rot.status}
                    </Badge>
                  </div>

                  {/* Informações do Veículo */}
                  {veiculo && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs">
                      <Car className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-bold text-foreground">
                          {veiculo.nome}
                        </span>
                        <span className="text-muted-foreground ml-1.5 font-mono">
                          ({veiculo.consumo_km_l} km/L • R$ {veiculo.preco_litro}/L)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Áreas do Roteiro */}
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Áreas Associadas ({areasDoRoteiro.length})
                    </span>
                    {areasDoRoteiro.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        Nenhuma área selecionada
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {areasDoRoteiro.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold"
                          >
                            <Pentagon className="w-3 h-3" />
                            {a.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {rot.observacoes && (
                    <p className="text-xs text-muted-foreground italic pt-1">
                      "{rot.observacoes}"
                    </p>
                  )}
                </div>

                {/* Ações do Card */}
                <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                  <Button
                    size="sm"
                    onClick={() => onStartTrackingRoteiro(rot)}
                    className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Iniciar Rastreamento
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirModalEditar(rot)}
                      className="h-8 w-8 p-0"
                      title="Editar Roteiro"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDeleteRoteiro(rot.id)}
                      className="h-8 w-8 p-0"
                      title="Excluir Roteiro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de Criação/Edição de Roteiro ── */}
      <StandardDialog
        open={modalAberto}
        onOpenChange={setModalAberto}
        title={roteiroEmEdicao?.id ? 'Editar Roteiro' : 'Planejar Dia de Campo'}
        description="Associe quais áreas serão visitadas e o veículo utilizado para cálculo de combustível."
        className="sm:max-w-[560px]"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Título do Roteiro *
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Vistorias Zona Norte - Roteiro 1"
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Data Planejada
              </Label>
              <Input
                type="date"
                value={dataPlanejada}
                onChange={(e) => setDataPlanejada(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RoteiroStatus)}
                className="h-9 w-full px-3 rounded-xl bg-muted/60 border border-border text-xs text-foreground font-semibold"
              >
                <option value="planejado">Planejado</option>
                <option value="em_execucao">Em Execução</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
          </div>

          {/* Seleção de Veículo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Veículo de Campo (Opcional)
            </Label>
            <select
              value={veiculoId}
              onChange={(e) => setVeiculoId(e.target.value)}
              className="h-9 w-full px-3 rounded-xl bg-muted/60 border border-border text-xs text-foreground font-semibold"
            >
              <option value="nenhum">Nenhum Veículo (A pé ou Não especificado)</option>
              {veiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome} ({v.consumo_km_l} km/L • {v.placa ?? 'Sem placa'})
                </option>
              ))}
            </select>
          </div>

          {/* Seleção de Múltiplas Áreas */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Selecione as Áreas a Visitar ({selectedAreaIds.length} selecionadas)
            </Label>
            {areas.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                Nenhuma área cadastrada no sistema.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-border rounded-xl p-2 space-y-1 bg-muted/20">
                {areas.map((a) => {
                  const isSelected = selectedAreaIds.includes(a.id);
                  return (
                    <div
                      key={a.id}
                      onClick={() => toggleAreaSelection(a.id)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold'
                          : 'hover:bg-muted/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: a.cor || '#3b82f6' }}
                        />
                        <span>{a.nome}</span>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatarArea(a.square_meters)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Instruções para a equipe de campo, prioridades..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalAberto(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !nome.trim()}
              className="h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? 'Salvando...' : 'Salvar Roteiro'}
            </Button>
          </div>
        </form>
      </StandardDialog>
    </div>
  );
}
