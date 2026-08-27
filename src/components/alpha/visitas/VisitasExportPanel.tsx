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
      <div className="bg-white border border-sidebar-border p-5 rounded-2xl shadow-xs">
        <h2 className="text-base font-bold text-sidebar-foreground flex items-center gap-2 mb-1">
          <Download className="w-5 h-5 text-sidebar-primary" />
          Central de Exportação &amp; Relatórios de Campo
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Exporte os dados geográficos, trajetos GPS e cadastros para diversos formatos profissionais.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-sidebar-accent/30 border border-sidebar-border p-3 rounded-xl flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-sidebar-primary shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block font-sans">Áreas</span>
              <strong className="text-sm text-sidebar-foreground">{areasAtivas.length} polígonos</strong>
            </div>
          </div>

          <div className="bg-sidebar-accent/30 border border-sidebar-border p-3 rounded-xl flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block font-sans">Pontos de Visita</span>
              <strong className="text-sm text-sidebar-foreground">{pontosAtivos.length} pins</strong>
            </div>
          </div>

          <div className="bg-sidebar-accent/30 border border-sidebar-border p-3 rounded-xl flex items-center gap-2.5">
            <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block font-sans">Trajetos GPS</span>
              <strong className="text-sm text-sidebar-foreground">{trajetosAtivos.length} percursos</strong>
            </div>
          </div>

          <div className="bg-sidebar-accent/30 border border-sidebar-border p-3 rounded-xl flex items-center gap-2.5">
            <Car className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block font-sans">Frota</span>
              <strong className="text-sm text-sidebar-foreground">{veiculosAtivos.length} veículos</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards de Formatos de Exportação ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Planilha Excel Multi-Abas */}
        <div className="bg-white border border-sidebar-border rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-emerald-500/40 transition-all shadow-xs">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-sidebar-foreground">
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
            className="w-full h-9 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {exportando === 'excel' ? 'Gerando...' : 'Baixar Planilha Excel (.xlsx)'}
          </Button>
        </div>

        {/* 2. GeoJSON Padronizado */}
        <div className="bg-white border border-sidebar-border rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-sidebar-primary/40 transition-all shadow-xs">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sidebar-accent text-sidebar-primary border border-sidebar-border flex items-center justify-center">
              <FileCode2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-sidebar-foreground">
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
            className="w-full h-9 text-xs font-bold gap-2 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white rounded-xl shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {exportando === 'geojson' ? 'Gerando...' : 'Baixar Camadas GeoJSON'}
          </Button>
        </div>

        {/* 3. Tabela CSV */}
        <div className="bg-white border border-sidebar-border rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-amber-500/40 transition-all shadow-xs">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-sidebar-foreground">
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
            className="w-full h-9 text-xs font-bold gap-2 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-xl cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {exportando === 'csv' ? 'Gerando...' : 'Baixar Arquivo CSV'}
          </Button>
        </div>

        {/* 4. Relatório Oficial para Impressão */}
        <div className="bg-white border border-sidebar-border rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-indigo-500/40 transition-all shadow-xs">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-sidebar-foreground">
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
            className="w-full h-9 text-xs font-bold gap-2 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-xl cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Imprimir / Salvar em PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
