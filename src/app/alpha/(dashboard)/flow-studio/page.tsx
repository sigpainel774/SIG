"use client";

import { ArrowLeft, Info, Sparkles } from "lucide-react";
import Link from "next/link";
import { FlowCanvas } from "@/components/alpha/flow/FlowCanvas";

export default function AlphaFlowStudioPage() {
  return (
    <div className="space-y-4">
      {/* ── Cabeçalho da Ferramenta ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/alpha"
            className="p-2 rounded-xl bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Voltar ao Catálogo Alpha"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground">Alpha Flow Studio</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3 h-3" />
                Novo Módulo
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Estúdio de modelagem visual de processos escolares, organogramas e esteiras
              administrativas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>Arraste elementos da lateral e conecte os pontos para criar fluxos.</span>
        </div>
      </div>

      {/* ── Quadro de Nós Interativo ── */}
      <FlowCanvas />
    </div>
  );
}
