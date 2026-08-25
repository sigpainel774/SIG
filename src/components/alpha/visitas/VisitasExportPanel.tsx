'use client';

import React, { useState } from 'react';
import {
  VisitasArea,
  VisitasPonto,
  VisitasTrajeto,
  VisitasVeiculo,
} from '@/types/visitas';
import { Button } from '@/components/ui/button';
import {
  FileSpreadsheet,
  FileText,
  FileCode2,
  Download,
  Share2,
  CheckCircle2,
  Layers,
  MapPin,
  Car,
  Navigation,
} from 'lucide-react';
import {
  exportarGeoJSON,
  exportarCSV,
  exportarExcelMultiAbas,
  baixarArquivo,
} from '@/lib/visitas/visitasExportService';
import { toast } from 'sonner';

interface VisitasExportPanelProps {
  areas: VisitasArea[];
  pontos: VisitasPonto[];
  trajetos: VisitasTrajeto[];
  veiculos: VisitasVeiculo[];
}

export function VisitasExportPanel({
  areas = [],
  pontos = [],
  trajetos = [],
  veiculos = [],
}: VisitasExportPanelProps) {
  const [exportando, setExportando] = useState<string | null>(null);

  const areasAtivas = areas.filter((a) => !a.deleted_at);
  const pontosAtivos = pontos.filter((p) => !p.deleted_at);
  const trajetosAtivos = trajetos.filter((t) => !t.deleted_at);
  const veiculosAtivos = veiculos.filter((v) => !v.deleted_at);

  const handleExportarExcel = () => {
    setExportando('excel');
    try {
      const blob = exportarExcelMultiAbas(
        areasAtivas,
        pontosAtivos,
        trajetosAtivos,
        veiculosAtivos
      );
      const dataStr = new Date().toISOString().split('T')[0];
      baixarArquivo(
        blob,
        `SIG_Visitas_Relatorio_Geral_${dataStr}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      toast.success('Planilha Excel (.xlsx) gerada com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar planilha Excel.');
    } finally {
      setExportando(null);
    }
  };

  const handleExportarGeoJSON = () => {
    setExportando('geojson');
    try {
      const jsonStr = exportarGeoJSON(areasAtivas, pontosAtivos);
      const dataStr = new Date().toISOString().split('T')[0];
      baixarArquivo(
        jsonStr,
        `SIG_Visitas_Georreferenciadas_${dataStr}.geojson`,
        'application/geo+json'
      );
      toast.success('Arquivo GeoJSON exportado! Compatível com QGIS e Google Earth.');
    } catch (err) {
      toast.error('Erro ao exportar GeoJSON.');
    } finally {
      setExportando(null);
    }
  };

  const handleExportarCSV = () => {
    setExportando('csv');
    try {
      const csvStr = exportarCSV(pontosAtivos, areasAtivas);
      const dataStr = new Date().toISOString().split('T')[0];
      baixarArquivo(csvStr, `SIG_Visitas_Pontos_${dataStr}.csv`, 'text/csv;charset=utf-8');
      toast.success('Arquivo CSV exportado com sucesso!');
    } catch (err) {
      toast.error('Erro ao exportar CSV.');
    } finally {
      setExportando(null);
    }
  };

  const handleImprimirRelatorio = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Resumo Geral dos Dados ── */}
      <div className="bg-card border border-border p-5 rounded-2xl">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
          <Download className="w-5 h-5 text-blue-400" />
          Central de Exportação &amp; Relatórios de Campo
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Exporte os dados geográficos, trajetos GPS e cadastros para diversos formatos profissionais.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-muted/40 border border-border p-3 rounded-xl flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Áreas</span>
              <strong className="text-sm text-foreground">{areasAtivas.length} polígonos</strong>
            </div>
          </div>

          <div className="bg-muted/40 border border-border p-3 rounded-xl flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Pontos de Visita</span>
              <strong className="text-sm text-foreground">{pontosAtivos.length} pins</strong>
            </div>
          </div>

          <div className="bg-muted/40 border border-border p-3 rounded-xl flex items-center gap-2.5">
            <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Trajetos GPS</span>
              <strong className="text-sm text-foreground">{trajetosAtivos.length} percursos</strong>
            </div>
          </div>

          <div className="bg-muted/40 border border-border p-3 rounded-xl flex items-center gap-2.5">
            <Car className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Frota</span>
              <strong className="text-sm text-foreground">{veiculosAtivos.length} veículos</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards de Formatos de Exportação ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Planilha Excel Multi-Abas */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-emerald-500/40 transition-all shadow-xs">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              Planilha Excel (.xlsx) Multi-Abas
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Exportação completa contendo 4 abas estruturadas: Áreas Delimitadas, Pontos de Visita, Histórico de Trajetos e Frota com estimativas de custos.
            </p>
          </div>

          <Button
            onClick={handleExportarExcel}
            disabled={exportando === 'excel'}
            size="sm"
            className="w-full h-9 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
          >
            <Download className="w-4 h-4" />
            {exportando === 'excel' ? 'Gerando...' : 'Baixar Planilha Excel (.xlsx)'}
          </Button>
        </div>

        {/* 2. GeoJSON Padronizado */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-blue-500/40 transition-all shadow-xs">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileCode2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              Camadas GeoJSON (.geojson)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Formato geoespacial universal compatível com softwares de SIG (QGIS, ArcGIS, Google Earth Pro e Mapbox) para auditoria e mapas temáticos.
            </p>
          </div>

          <Button
            onClick={handleExportarGeoJSON}
            disabled={exportando === 'geojson'}
            size="sm"
            className="w-full h-9 text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            <Download className="w-4 h-4" />
            {exportando === 'geojson' ? 'Gerando...' : 'Baixar Camadas GeoJSON'}
          </Button>
        </div>

        {/* 3. Tabela CSV */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-amber-500/40 transition-all shadow-xs">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              Tabela CSV (.csv)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Exportação em texto delimitado por vírgulas para importação rápida em bancos de dados, planilhas simples e ferramentas de BI.
            </p>
          </div>

          <Button
            onClick={handleExportarCSV}
            disabled={exportando === 'csv'}
            size="sm"
            variant="outline"
            className="w-full h-9 text-xs font-bold gap-2 border-border text-foreground hover:bg-muted/40 rounded-xl"
          >
            <Download className="w-4 h-4" />
            {exportando === 'csv' ? 'Gerando...' : 'Baixar Arquivo CSV'}
          </Button>
        </div>

        {/* 4. Relatório Oficial para Impressão */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-indigo-500/40 transition-all shadow-xs">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              Relatório Oficial para Impressão / PDF
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gera a visualização oficial institucional pronta para impressão ou exportação em PDF pelo navegador com carimbo da SEMED.
            </p>
          </div>

          <Button
            onClick={handleImprimirRelatorio}
            size="sm"
            variant="outline"
            className="w-full h-9 text-xs font-bold gap-2 border-border text-foreground hover:bg-muted/40 rounded-xl"
          >
            <FileText className="w-4 h-4" />
            Imprimir / Salvar em PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
