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
import {
  VisitasPonto,
  VisitasArea,
  PontoCategoria,
  PontoStatus,
} from '@/types/visitas';
import { MapPin, Save, Crosshair, Camera, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface VisitasPontoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ponto: Partial<VisitasPonto> | null;
  areas: VisitasArea[];
  onSave: (pontoData: Partial<VisitasPonto>) => Promise<void>;
}

const CATEGORIAS: PontoCategoria[] = [
  'Geral',
  'Problema',
  'Observacao',
  'Visita',
  'Imovel',
  'Vegetacao',
  'Outro',
];

export function VisitasPontoModal({
  open,
  onOpenChange,
  ponto,
  areas = [],
  onSave,
}: VisitasPontoModalProps) {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<PontoCategoria>('Geral');
  const [status, setStatus] = useState<PontoStatus>('pendente');
  const [areaId, setAreaId] = useState<string>('nenhuma');
  const [latitude, setLatitude] = useState<number | string>('');
  const [longitude, setLongitude] = useState<number | string>('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ponto) {
      setNome(ponto.nome ?? '');
      setCategoria(ponto.categoria ?? 'Geral');
      setStatus(ponto.status ?? 'pendente');
      setAreaId(ponto.area_id ?? 'nenhuma');
      setLatitude(ponto.latitude ?? '');
      setLongitude(ponto.longitude ?? '');
      setDescricao(ponto.descricao ?? '');
    }
  }, [ponto, open]);

  const capturarLocalizacaoAtual = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada no navegador.');
      return;
    }

    toast.info('Obtendo sinal de satélite GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        toast.success('Coordenadas GPS capturadas com precisão!');
      },
      (err) => {
        toast.error('Não foi possível obter a localização GPS atual.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || latitude === '' || longitude === '') {
      toast.error('Preencha o nome e as coordenadas do ponto.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...ponto,
        nome: nome.trim(),
        categoria,
        status,
        area_id: areaId === 'nenhuma' ? null : areaId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        descricao: descricao.trim() || null,
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
      title={ponto?.id ? 'Editar Ponto de Visita' : 'Novo Ponto de Interesse'}
      description="Cadastre pins no mapa com categoria, status e observações georreferenciadas."
      className="sm:max-w-[520px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <Label htmlFor="ponto-nome" className="text-xs font-bold text-foreground">
            Nome do Ponto *
          </Label>
          <Input
            id="ponto-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Poço Artesiano, Ponte Quebrada, Entrada Principal"
            className="h-9 text-xs"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Categoria</Label>
            <Select
              value={categoria}
              onValueChange={(val) => setCategoria(val as PontoCategoria)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Status</Label>
            <Select
              value={status}
              onValueChange={(val) => setStatus(val as PontoStatus)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status da visita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="visitado">Visitado</SelectItem>
                <SelectItem value="ignorado">Ignorado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground">
            Vincular à Área (Opcional)
          </Label>
          <Select value={areaId} onValueChange={(val) => setAreaId(val ?? 'nenhuma')}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecione uma área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhuma">Nenhuma Área (Ponto Isolado)</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Coordenadas Geográficas */}
        <div className="bg-muted/40 border border-border p-3 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Coordenadas Geográficas *
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={capturarLocalizacaoAtual}
              className="h-7 text-[11px] gap-1 px-2 border-blue-500/40 text-blue-300 hover:bg-blue-950/40"
            >
              <Crosshair className="w-3 h-3" />
              Capturar GPS Atual
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Latitude</Label>
              <Input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-12.7214"
                className="h-8 text-xs font-mono"
                required
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Longitude</Label>
              <Input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-39.1989"
                className="h-8 text-xs font-mono"
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ponto-desc" className="text-xs font-bold text-foreground">
            Descrição / Anotações
          </Label>
          <Textarea
            id="ponto-desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes, problemas identificados ou referências visuais..."
            rows={2}
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
            {saving ? 'Salvando...' : 'Salvar Ponto'}
          </Button>
        </div>
      </form>
    </StandardDialog>
  );
}
