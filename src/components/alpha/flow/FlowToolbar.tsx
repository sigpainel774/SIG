"use client";

import { Download, Layers, Maximize2, RotateCcw, Sparkles, Upload } from "lucide-react";
import type React from "react";
import { useRef } from "react";
import { toast } from "sonner";
import { FLOW_TEMPLATES, type FlowTemplate } from "./templates";

interface FlowToolbarProps {
  onLoadTemplate: (template: FlowTemplate) => void;
  onClear: () => void;
  onExportJson: () => void;
  onImportJson: (data: { nodes: any[]; edges: any[] }) => void;
  onFitView: () => void;
  nodesCount: number;
  edgesCount: number;
}

export function FlowToolbar({
  onLoadTemplate,
  onClear,
  onExportJson,
  onImportJson,
  onFitView,
  nodesCount,
  edgesCount,
}: FlowToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          onImportJson(parsed);
          toast.success("Fluxo carregado com sucesso!");
        } else {
          toast.error("Arquivo JSON inválido (deve conter nós e conexões).");
        }
      } catch (_err) {
        toast.error("Falha ao ler arquivo JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <header className="h-14 bg-card border-b border-border px-4 flex items-center justify-between gap-3 select-none shrink-0">
      {/* ── Esquerda: Estatísticas e Templates ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-foreground hidden sm:inline">
            Alpha Flow Studio
          </span>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Seletor de Templates Prontos */}
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <select
            defaultValue=""
            onChange={(e) => {
              const tmpl = FLOW_TEMPLATES.find((t) => t.id === e.target.value);
              if (tmpl) {
                onLoadTemplate(tmpl);
                toast.success(`Modelo "${tmpl.titulo}" carregado!`);
              }
              e.target.value = "";
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-[200px]"
          >
            <option value="" disabled>
              Carregar Modelo Pronto...
            </option>
            {FLOW_TEMPLATES.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.titulo}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-md border border-border">
          <span>
            <strong className="text-foreground">{nodesCount}</strong> nós
          </span>
          <span>•</span>
          <span>
            <strong className="text-foreground">{edgesCount}</strong> conexões
          </span>
        </div>
      </div>

      {/* ── Direita: Ações de Exportação, Importação e Ajuste ── */}
      <div className="flex items-center gap-2">
        {/* Centralizar Visualização */}
        <button
          type="button"
          onClick={onFitView}
          className="p-2 rounded-lg bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Centralizar e ajustar tela (Fit View)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Importar JSON */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
          title="Importar fluxo de arquivo JSON"
        >
          <Upload className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Importar</span>
        </button>

        {/* Exportar JSON */}
        <button
          type="button"
          onClick={onExportJson}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          title="Baixar fluxo em formato JSON"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar JSON</span>
        </button>

        {/* Limpar Quadro */}
        <button
          type="button"
          onClick={onClear}
          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          title="Limpar quadro"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
