'use client';

import React, { useState } from 'react';
import {
  VisitasVeiculo,
  TipoCombustivel,
} from '@/types/visitas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StandardDialog } from '@/components/ui/standard-dialog';
import {
  Car,
  Plus,
  Edit3,
  Trash2,
  Fuel,
  Gauge,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

interface VisitasVeiculosTabProps {
  veiculos: VisitasVeiculo[];
  onSaveVeiculo: (veiculoData: Partial<VisitasVeiculo>) => Promise<void>;
  onDeleteVeiculo: (veiculoId: string) => Promise<void>;
}

export function VisitasVeiculosTab({
  veiculos = [],
  onSaveVeiculo,
  onDeleteVeiculo,
}: VisitasVeiculosTabProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [veiculoEmEdicao, setVeiculoEmEdicao] = useState<Partial<VisitasVeiculo> | null>(null);

  const [nome, setNome] = useState('');
  const [placa, setPlaca] = useState('');
  const [motor, setMotor] = useState('');
  const [tipoCombustivel, setTipoCombustivel] = useState<TipoCombustivel>('gasolina');
  const [consumoKmL, setConsumoKmL] = useState('10.0');
  const [precoLitro, setPrecoLitro] = useState('6.00');
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  const abrirModalNovo = () => {
    setVeiculoEmEdicao(null);
    setNome('');
    setPlaca('');
    setMotor('1.0');
    setTipoCombustivel('gasolina');
    setConsumoKmL('10.0');
    setPrecoLitro('6.00');
    setAtivo(true);
    setModalAberto(true);
  };

  const abrirModalEditar = (v: VisitasVeiculo) => {
    setVeiculoEmEdicao(v);
    setNome(v.nome);
    setPlaca(v.placa ?? '');
    setMotor(v.motor ?? '');
    setTipoCombustivel(v.tipo_combustivel);
    setConsumoKmL(String(v.consumo_km_l));
    setPrecoLitro(String(v.preco_litro));
    setAtivo(v.ativo);
    setModalAberto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Informe o nome do veículo.');
      return;
    }

    setSaving(true);
    try {
      await onSaveVeiculo({
        ...veiculoEmEdicao,
        nome: nome.trim(),
        placa: placa.trim() || null,
        motor: motor.trim() || null,
        tipo_combustivel: tipoCombustivel,
        consumo_km_l: Number(consumoKmL) || 10,
        preco_litro: Number(precoLitro) || 6,
        ativo,
      });
      setModalAberto(false);
      toast.success('Veículo salvo com sucesso!');
    } finally {
      setSaving(false);
    }
  };

  const veiculosAtivos = veiculos.filter((v) => !v.deleted_at);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-400" />
            Frota de Veículos e Estimativas de Combustível
          </h2>
          <p className="text-xs text-muted-foreground">
            Cadastre os veículos utilizados em campo com parâmetros de consumo para cálculo automático de custos.
          </p>
        </div>

        <Button
          onClick={abrirModalNovo}
          size="sm"
          className="h-9 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Veículo
        </Button>
      </div>

      {veiculosAtivos.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40 space-y-3">
          <Car className="w-10 h-10 text-muted-foreground mx-auto" />
          <div className="text-sm font-semibold text-foreground">
            Nenhum veículo cadastrado
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Cadastre os carros, motos ou vans de serviço da prefeitura para monitorar o consumo.
          </p>
          <Button
            onClick={abrirModalNovo}
            size="sm"
            variant="outline"
            className="text-xs font-semibold gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Primeiro Veículo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {veiculosAtivos.map((v) => {
            const custoPorKm =
              v.consumo_km_l > 0 ? (v.preco_litro / v.consumo_km_l).toFixed(2) : '0.00';

            return (
              <div
                key={v.id}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-blue-500/40 transition-all shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">
                        {v.nome}
                      </h3>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {v.placa ? `Placa: ${v.placa}` : 'Sem placa'} {v.motor ? `• ${v.motor}` : ''}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold ${
                        v.ativo
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                          : 'border-slate-500/40 text-slate-400 bg-slate-500/10'
                      }`}
                    >
                      {v.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-xl text-xs font-mono text-center">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Consumo</span>
                      <strong className="text-foreground">{v.consumo_km_l} km/L</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Combustível</span>
                      <strong className="text-foreground">R$ {v.preco_litro}/L</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Custo/km</span>
                      <strong className="text-emerald-400">R$ {custoPorKm}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-border gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirModalEditar(v)}
                    className="h-8 text-xs font-semibold gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDeleteVeiculo(v.id)}
                    className="h-8 w-8 p-0"
                    title="Excluir Veículo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de Cadastro/Edição de Veículo ── */}
      <StandardDialog
        open={modalAberto}
        onOpenChange={setModalAberto}
        title={veiculoEmEdicao?.id ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
        description="Parâmetros de rendimento e combustível do veículo de campo."
        className="sm:max-w-[500px]"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Nome / Identificação *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Fiat Strada 01, Hilux Secretaria, Moto Honda"
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Placa (Opcional)</Label>
              <Input
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
                placeholder="Ex: BRA2E19"
                className="h-9 text-xs uppercase font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Motor / Modelo</Label>
              <Input
                value={motor}
                onChange={(e) => setMotor(e.target.value)}
                placeholder="Ex: 1.4 Firefly, 2.8 Diesel"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Combustível</Label>
              <select
                value={tipoCombustivel}
                onChange={(e) => setTipoCombustivel(e.target.value as TipoCombustivel)}
                className="h-9 w-full px-2.5 rounded-xl bg-muted/60 border border-border text-xs text-foreground font-semibold"
              >
                <option value="gasolina">Gasolina</option>
                <option value="etanol">Etanol</option>
                <option value="diesel">Diesel</option>
                <option value="gnv">GNV</option>
                <option value="eletrico">Elétrico</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Consumo (km/L)</Label>
              <Input
                type="number"
                step="0.1"
                value={consumoKmL}
                onChange={(e) => setConsumoKmL(e.target.value)}
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Preço/Litro (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={precoLitro}
                onChange={(e) => setPrecoLitro(e.target.value)}
                className="h-9 text-xs font-mono"
                required
              />
            </div>
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
              {saving ? 'Salvando...' : 'Salvar Veículo'}
            </Button>
          </div>
        </form>
      </StandardDialog>
    </div>
  );
}
