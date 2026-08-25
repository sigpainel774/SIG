'use client';

import React, { useState, useEffect } from 'react';
import { StandardDialog } from '@/components/ui/standard-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VisitasArea, AreaStatus } from '@/types/visitas';
import { formatarArea } from '@/lib/visitas/areaCalculator';
import { Pentagon, Save, X } from 'lucide-react';

const CORES_PALETA = [
  { label: 'Azul', hex: '#3b82f6' },
  { label: 'Esmeralda', hex: '#10b981' },
  { label: 'Âmbar', hex: '#f59e0b' },
  { label: 'Púrpura', hex: '#8b5cf6' },
  { label: 'Rosa', hex: '#ec4899' },
  { label: 'Ciano', hex: '#06b6d4' },
];

interface VisitasAreaEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: Partial<VisitasArea> | null;
  onSave: (areaData: Partial<VisitasArea>) => Promise<void>;
}

export function VisitasAreaEditorModal({
  open,
  onOpenChange,
  area,
  onSave,
}: VisitasAreaEditorModalProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<AreaStatus>('pendente');
  const [cor, setCor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (area) {
      setNome(area.nome ?? '');
      setDescricao(area.descricao ?? '');
      setStatus(area.status ?? 'pendente');
      setCor(area.cor ?? '#3b82f6');
    }
  }, [area, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setSaving(true);
    try {
      await onSave({
        ...area,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        status,
        cor,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={area?.id ? 'Editar Área Georreferenciada' : 'Salvar Nova Área Delimitada'}
      description="Metadados, status operacional e dimensões da área poligonal."
      className="sm:max-w-[540px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Painel com Métricas de Dimensão */}
        {area && (
          <div className="bg-muted/40 border border-border p-3.5 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: cor }}
              >
                <Pentagon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase">
                  Dimensão Calculada
                </span>
                <div className="text-sm font-mono font-bold text-foreground">
                  {formatarArea(area.square_meters ?? 0)}
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground font-mono">
              <div>{(area.hectares ?? 0).toFixed(4)} ha</div>
              <div>{area.vertices?.length ?? 0} vértices</div>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="area-nome" className="text-xs font-bold text-foreground">
            Nome da Área *
          </Label>
          <Input
            id="area-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Fazenda Boa Vista, Zona Rural Sul, Gleba A"
            className="h-9 text-xs"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Status</Label>
            <Select
              value={status}
              onValueChange={(val) => setStatus(val as AreaStatus)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Cor de Destaque</Label>
            <div className="flex items-center gap-1.5 pt-1">
              {CORES_PALETA.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setCor(c.hex)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    cor === c.hex
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="area-desc" className="text-xs font-bold text-foreground">
            Observações e Descrição
          </Label>
          <Textarea
            id="area-desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Anotações gerais de campo, relevo, pontos de referência..."
            rows={3}
            className="text-xs resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
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
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Salvando...' : 'Salvar Área'}
          </Button>
        </div>
      </form>
    </StandardDialog>
  );
}
