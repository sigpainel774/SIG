"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  GitCommitHorizontal,
  HelpCircle,
  School,
  Shield,
  UserCheck,
} from "lucide-react";
import { memo } from "react";

// --- 1. Nó de Unidade Escolar ---
export const EscolaNode = memo(({ data, selected }: NodeProps) => {
  const nome = (data?.label as string) || "Unidade Escolar";
  const codigo = (data?.codigo as string) || "ESC-001";
  const turnos = (data?.turnos as string) || "Matutino / Vespertino";
  const alunos = (data?.alunos as string) || "350 Alunos";

  return (
    <div
      className={`min-w-[220px] rounded-2xl bg-card border-2 shadow-md transition-all duration-200 overflow-hidden ${
        selected
          ? "border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02]"
          : "border-border hover:border-border/80"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
      <div className="bg-primary/10 border-b border-border px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-primary/20 text-primary">
            <School className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Escola Municipal
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold bg-background/80 px-1.5 py-0.5 rounded border border-border text-foreground">
          {codigo}
        </span>
      </div>

      <div className="p-3 space-y-1.5">
        <h4 className="text-xs font-bold text-foreground leading-tight">{nome}</h4>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span>{turnos}</span>
        </div>
        <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border">
          <span>Capacidade</span>
          <span className="font-semibold text-foreground">{alunos}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
    </div>
  );
});
EscolaNode.displayName = "EscolaNode";

// --- 2. Nó de Cargo / Servidor ---
export const CargoNode = memo(({ data, selected }: NodeProps) => {
  const cargo = (data?.label as string) || "Diretor Escolar";
  const responsavel = (data?.responsavel as string) || "Servidor Designado";
  const nivel = (data?.nivel as string) || "Nível 2";

  return (
    <div
      className={`min-w-[200px] rounded-2xl bg-card border-2 shadow-md transition-all duration-200 overflow-hidden ${
        selected
          ? "border-blue-500 ring-2 ring-blue-500/20 shadow-lg scale-[1.02]"
          : "border-border hover:border-border/80"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
      />
      <div className="bg-blue-500/10 border-b border-border px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Quadro Funcional
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <Shield className="w-2.5 h-2.5" />
          <span>{nivel}</span>
        </div>
      </div>

      <div className="p-3 space-y-1">
        <h4 className="text-xs font-bold text-foreground leading-tight">{cargo}</h4>
        <p className="text-[11px] text-muted-foreground truncate">{responsavel}</p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
      />
    </div>
  );
});
CargoNode.displayName = "CargoNode";

// --- 3. Nó de Etapa de Processo ---
export const ProcessoNode = memo(({ data, selected }: NodeProps) => {
  const titulo = (data?.label as string) || "Validação de Documentos";
  const descricao = (data?.descricao as string) || "Conferência de certidão e histórico";
  const status = (data?.status as string) || "Em Análise";

  const getStatusBadge = () => {
    switch (status) {
      case "Concluído":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <CheckCircle className="w-2.5 h-2.5" />
            Concluído
          </span>
        );
      case "Alerta":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            <AlertTriangle className="w-2.5 h-2.5" />
            Requer Atenção
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
            <Clock className="w-2.5 h-2.5" />
            Em Trâmite
          </span>
        );
    }
  };

  return (
    <div
      className={`min-w-[210px] max-w-[260px] rounded-2xl bg-card border-2 shadow-md transition-all duration-200 overflow-hidden ${
        selected
          ? "border-purple-500 ring-2 ring-purple-500/20 shadow-lg scale-[1.02]"
          : "border-border hover:border-border/80"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
      />
      <div className="bg-purple-500/10 border-b border-border px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">
            <GitCommitHorizontal className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Etapa de Fluxo
          </span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="p-3 space-y-1">
        <h4 className="text-xs font-bold text-foreground leading-tight">{titulo}</h4>
        <p className="text-[11px] text-muted-foreground leading-snug">{descricao}</p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
      />
    </div>
  );
});
ProcessoNode.displayName = "ProcessoNode";

// --- 4. Nó de Decisão / Condição ---
export const CondicaoNode = memo(({ data, selected }: NodeProps) => {
  const pergunta = (data?.label as string) || "Há Vagas Disponíveis?";
  const condicao = (data?.condicao as string) || "Verificação Automática";

  return (
    <div
      className={`min-w-[200px] max-w-[240px] rounded-2xl bg-card border-2 shadow-md transition-all duration-200 overflow-hidden ${
        selected
          ? "border-amber-500 ring-2 ring-amber-500/20 shadow-lg scale-[1.02]"
          : "border-border hover:border-border/80"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background"
      />
      <div className="bg-amber-500/10 border-b border-border px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Ponto de Decisão
          </span>
        </div>
      </div>

      <div className="p-3 space-y-1.5 text-center">
        <h4 className="text-xs font-bold text-foreground leading-tight">{pergunta}</h4>
        <span className="inline-block text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {condicao}
        </span>
      </div>

      <div className="px-3 pb-2 flex items-center justify-between text-[10px] font-bold">
        <span className="text-emerald-600 dark:text-emerald-400">← SIM</span>
        <span className="text-destructive">NÃO →</span>
      </div>

      <Handle
        type="source"
        position={Position.Left}
        id="sim"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="nao"
        className="!w-3 !h-3 !bg-destructive !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background"
      />
    </div>
  );
});
CondicaoNode.displayName = "CondicaoNode";

// Objeto de mapeamento para o ReactFlow
export const nodeTypes = {
  escola: EscolaNode,
  cargo: CargoNode,
  processo: ProcessoNode,
  condicao: CondicaoNode,
};
