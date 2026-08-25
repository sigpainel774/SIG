'use client';

import React, { useState } from 'react';
import { VisitasGeoPdfMap, PdfControlPoint } from '@/types/visitas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StandardDialog } from '@/components/ui/standard-dialog';
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Eye,
  Sliders,
  Layers,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { renderizarPaginaPdf, estimarGeoBoundsDePontosControle } from '@/lib/visitas/geoPdfRenderer';
import { toast } from 'sonner';

interface VisitasGeoPdfTabProps {
  mapas: VisitasGeoPdfMap[];
  onSaveMapa: (mapaData: Partial<VisitasGeoPdfMap>) => Promise<void>;
  onDeleteMapa: (mapaId: string) => Promise<void>;
  onToggleVisibilidade: (mapa: VisitasGeoPdfMap) => Promise<void>;
}

export function VisitasGeoPdfTab({
  mapas = [],
  onSaveMapa,
  onDeleteMapa,
  onToggleVisibilidade,
}: VisitasGeoPdfTabProps) {
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
  const [numeroPagina, setNumeroPagina] = useState(1);
  const [opacidade, setOpacidade] = useState(0.7);
  const [renderizando, setRenderizando] = useState(false);

  // Pontos de controle de calibração
  const [pontosControle, setPontosControle] = useState<PdfControlPoint[]>([
    { id: '1', pdfX: 0.1, pdfY: 0.1, lat: -12.720, lng: -39.200 },
    { id: '2', pdfX: 0.9, pdfY: 0.9, lat: -12.725, lng: -39.195 },
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setArquivoPdf(file);
      setNome(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleImportar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivoPdf || !nome.trim()) {
      toast.error('Selecione um arquivo PDF e defina um nome.');
      return;
    }

    setRenderizando(true);
    try {
      toast.info('Processando e renderizando página do PDF...');
      const renderResult = await renderizarPaginaPdf(arquivoPdf, numeroPagina, 1.5);

      const bounds = estimarGeoBoundsDePontosControle(
        pontosControle,
        renderResult.width,
        renderResult.height
      );

      await onSaveMapa({
        nome: nome.trim(),
        pdf_url: arquivoPdf.name,
        imagem_renderizada_url: renderResult.dataUrl,
        numero_pagina: numeroPagina,
        pontos_controle: pontosControle,
        opacidade,
        rotacao: 0,
        is_visible: true,
        origem_calibracao: 'manual',
        geo_bounds: bounds,
      });

      setModalImportarAberto(false);
      toast.success('Mapa GeoPDF importado e calibrado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao renderizar GeoPDF:', err);
      toast.error('Falha ao processar o arquivo PDF. Verifique se o arquivo é válido.');
    } finally {
      setRenderizando(false);
    }
  };

  const mapasAtivos = mapas.filter((m) => !m.deleted_at);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Mapas &amp; Plantas Cartográficas GeoPDF
          </h2>
          <p className="text-xs text-muted-foreground">
            Importe plantas em PDF, calibre as coordenadas e sobreponha as camadas diretamente sobre o mapa do SIG.
          </p>
        </div>

        <Button
          onClick={() => setModalImportarAberto(true)}
          size="sm"
          className="h-9 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs rounded-xl"
        >
          <Upload className="w-4 h-4" />
          Importar Planta PDF
        </Button>
      </div>

      {mapasAtivos.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40 space-y-3">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
          <div className="text-sm font-semibold text-foreground">
            Nenhum mapa GeoPDF importado
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Faça upload de plantas topográficas ou mapas municipais para visualização offline no campo.
          </p>
          <Button
            onClick={() => setModalImportarAberto(true)}
            size="sm"
            variant="outline"
            className="text-xs font-semibold gap-1.5 mt-2"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar Primeiro PDF
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {mapasAtivos.map((mapa) => (
            <div
              key={mapa.id}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-blue-500/40 transition-all shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      {mapa.nome}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      Página {mapa.numero_pagina} • Opacidade {Math.round(mapa.opacidade * 100)}%
                    </span>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold ${
                      mapa.is_visible
                        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                        : 'border-slate-500/40 text-slate-400 bg-slate-500/10'
                    }`}
                  >
                    {mapa.is_visible ? 'Visível no Mapa' : 'Oculto'}
                  </Badge>
                </div>

                {mapa.imagem_renderizada_url && (
                  <div className="relative h-28 rounded-xl overflow-hidden border border-border bg-black/40">
                    <img
                      src={mapa.imagem_renderizada_url}
                      alt={mapa.nome}
                      className="w-full h-full object-cover opacity-80"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleVisibilidade(mapa)}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    mapa.is_visible ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {mapa.is_visible ? 'Ocultar Camada' : 'Exibir no Mapa'}
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteMapa(mapa.id)}
                  className="h-8 w-8 p-0"
                  title="Excluir Mapa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de Importação de GeoPDF ── */}
      <StandardDialog
        open={modalImportarAberto}
        onOpenChange={setModalImportarAberto}
        title="Importar e Calibrar Planta PDF"
        description="Carregue o arquivo PDF para renderizar e sobrepor no mapa interativo."
        className="sm:max-w-[540px]"
      >
        <form onSubmit={handleImportar} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Arquivo PDF *</Label>
            <Input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Nome da Planta / Mapa *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Planta Topográfica Bairro Centro"
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Número da Página</Label>
              <Input
                type="number"
                min="1"
                value={numeroPagina}
                onChange={(e) => setNumeroPagina(Math.max(1, Number(e.target.value)))}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Opacidade Inicial ({Math.round(opacidade * 100)}%)
              </Label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={opacidade}
                onChange={(e) => setOpacidade(Number(e.target.value))}
                className="w-full mt-2 accent-blue-600"
              />
            </div>
          </div>

          {/* Pontos de Controle de Calibração */}
          <div className="bg-muted/40 border border-border p-3 rounded-xl space-y-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Pontos de Controle de Calibração
            </span>
            <p className="text-[11px] text-muted-foreground">
              Define os cantos geográficos de referência para projetar a imagem sobre o mapa.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-black/20 border border-border">
                <span className="text-[10px] text-muted-foreground block">Canto Superior Esquerdo</span>
                <div>Lat: {pontosControle[0].lat.toFixed(4)}</div>
                <div>Lng: {pontosControle[0].lng.toFixed(4)}</div>
              </div>
              <div className="p-2 rounded bg-black/20 border border-border">
                <span className="text-[10px] text-muted-foreground block">Canto Inferior Direito</span>
                <div>Lat: {pontosControle[1].lat.toFixed(4)}</div>
                <div>Lng: {pontosControle[1].lng.toFixed(4)}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalImportarAberto(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={renderizando || !arquivoPdf}
              className="h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="w-3.5 h-3.5" />
              {renderizando ? 'Renderizando PDF...' : 'Importar & Calibrar'}
            </Button>
          </div>
        </form>
      </StandardDialog>
    </div>
  );
}
