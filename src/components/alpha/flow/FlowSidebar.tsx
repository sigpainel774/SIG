"use client";

import type { Node } from "@xyflow/react";
import {
  GitCommitHorizontal,
  HelpCircle,
  Layers,
  Plus,
  School,
  Sliders,
  Trash2,
  UserCheck,
} from "lucide-react";
import type React from "react";

interface FlowSidebarProps {
  selectedNode: Node | null;
  onUpdateNodeData: (id: string, newData: Record<string, any>) => void;
  onDeleteSelectedNode: () => void;
}

export function FlowSidebar({
  selectedNode,
  onUpdateNodeData,
  onDeleteSelectedNode,
}: FlowSidebarProps) {
  const onDragStart = (
    event: React.DragEvent,
    nodeType: string,
    defaultData: Record<string, any>,
  ) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.setData("application/reactflow-data", JSON.stringify(defaultData));
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-80 bg-card border-r border-border flex flex-col h-full overflow-y-auto select-none">
      {/* ── Topo da Sidebar ── */}
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Paleta de Elementos</h3>
            <p className="text-[11px] text-muted-foreground">
              Arraste os nós para dentro do quadro
            </p>
          </div>
        </div>
      </div>

      {/* ── Seção 1: Nós Arrastáveis ── */}
      <div className="p-4 space-y-4 flex-1">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2.5">
            Componentes Escolares
          </span>

          <div className="space-y-2.5">
            {/* 1. Nó Escola */}
            <div
              draggable
              onDragStart={(e) =>
                onDragStart(e, "escola", {
                  label: "Nova Escola Municipal",
                  codigo: `ESC-${Math.floor(100 + Math.random() * 900)}`,
                  turnos: "Matutino / Vespertino",
                  alunos: "300 Alunos",
                })
              }
              className="group p-3 rounded-xl bg-background border border-border hover:border-primary/50 hover:shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <School className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Unidade Escolar</span>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Escola com código, turnos e capacidade
                </p>
              </div>
            </div>

            {/* 2. Nó Cargo */}
            <div
              draggable
              onDragStart={(e) =>
                onDragStart(e, "cargo", {
                  label: "Novo Cargo",
                  responsavel: "Nome do Servidor",
                  nivel: "Nível 3",
                })
              }
              className="group p-3 rounded-xl bg-background border border-border hover:border-blue-500/50 hover:shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Cargo / Servidor</span>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Função com nível de hierarquia
                </p>
              </div>
            </div>

            {/* 3. Nó Processo */}
            <div
              draggable
              onDragStart={(e) =>
                onDragStart(e, "processo", {
                  label: "Nova Etapa",
                  descricao: "Descrição do procedimento administrativo",
                  status: "Em Trâmite",
                })
              }
              className="group p-3 rounded-xl bg-background border border-border hover:border-purple-500/50 hover:shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                <GitCommitHorizontal className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Etapa de Fluxo</span>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Ação com status e detalhamento
                </p>
              </div>
            </div>

            {/* 4. Nó Decisão */}
            <div
              draggable
              onDragStart={(e) =>
                onDragStart(e, "condicao", {
                  label: "Critério de Decisão?",
                  condicao: "Condicional Automática",
                })
              }
              className="group p-3 rounded-xl bg-background border border-border hover:border-amber-500/50 hover:shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Ponto de Decisão</span>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Bifurcação lógica Sim / Não
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Seção 2: Editor de Propriedades do Nó Selecionado ── */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Propriedades
              </span>
            </div>
            {selectedNode && (
              <button
                type="button"
                onClick={onDeleteSelectedNode}
                className="text-[11px] font-semibold text-destructive hover:bg-destructive/10 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                title="Excluir nó selecionado"
              >
                <Trash2 className="w-3 h-3" />
                Excluir
              </button>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-3 bg-muted/30 p-3 rounded-xl border border-border">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Título / Rótulo
                </label>
                <input
                  type="text"
                  value={(selectedNode.data?.label as string) || ""}
                  onChange={(e) =>
                    onUpdateNodeData(selectedNode.id, {
                      ...selectedNode.data,
                      label: e.target.value,
                    })
                  }
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {selectedNode.type === "escola" && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Código da Escola
                    </label>
                    <input
                      type="text"
                      value={(selectedNode.data?.codigo as string) || ""}
                      onChange={(e) =>
                        onUpdateNodeData(selectedNode.id, {
                          ...selectedNode.data,
                          codigo: e.target.value,
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Turnos de Funcionamento
                    </label>
                    <input
                      type="text"
                      value={(selectedNode.data?.turnos as string) || ""}
                      onChange={(e) =>
                        onUpdateNodeData(selectedNode.id, {
                          ...selectedNode.data,
                          turnos: e.target.value,
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </>
              )}

              {selectedNode.type === "cargo" && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Responsável / Servidor
                    </label>
                    <input
                      type="text"
                      value={(selectedNode.data?.responsavel as string) || ""}
                      onChange={(e) =>
                        onUpdateNodeData(selectedNode.id, {
                          ...selectedNode.data,
                          responsavel: e.target.value,
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Nível de Acesso
                    </label>
                    <input
                      type="text"
                      value={(selectedNode.data?.nivel as string) || ""}
                      onChange={(e) =>
                        onUpdateNodeData(selectedNode.id, {
                          ...selectedNode.data,
                          nivel: e.target.value,
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </>
              )}

              {selectedNode.type === "processo" && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Descrição da Etapa
                    </label>
                    <textarea
                      rows={2}
                      value={(selectedNode.data?.descricao as string) || ""}
                      onChange={(e) =>
                        onUpdateNodeData(selectedNode.id, {
                          ...selectedNode.data,
                          descricao: e.target.value,
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Status
                    </label>
                    <select
                      value={(selectedNode.data?.status as string) || "Em Trâmite"}
                      onChange={(e) =>
                        onUpdateNodeData(selectedNode.id, {
                          ...selectedNode.data,
                          status: e.target.value,
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="Em Trâmite">Em Trâmite</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Alerta">Requer Atenção</option>
                    </select>
                  </div>
                </>
              )}

              {selectedNode.type === "condicao" && (
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Critério / Regra
                  </label>
                  <input
                    type="text"
                    value={(selectedNode.data?.condicao as string) || ""}
                    onChange={(e) =>
                      onUpdateNodeData(selectedNode.id, {
                        ...selectedNode.data,
                        condicao: e.target.value,
                      })
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              Selecione um nó no quadro para editar seus dados.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
