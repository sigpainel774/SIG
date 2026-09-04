"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  MiniMap,
  type Node,
  ReactFlow,
  type ReactFlowInstance,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import "@xyflow/react/dist/style.css";

import { toast } from "sonner";
import { FlowSidebar } from "./FlowSidebar";
import { FlowToolbar } from "./FlowToolbar";
import { nodeTypes } from "./nodes/CustomNodes";
import { FLOW_TEMPLATES, type FlowTemplate } from "./templates";

// Template inicial padrão
const initialTemplate = FLOW_TEMPLATES[0];

function FlowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialTemplate.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialTemplate.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const { fitView } = useReactFlow();

  // Conexão entre nós
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { strokeWidth: 2 },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  // Drag over para aceitar elementos da sidebar
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Drop para instanciar novo nó na posição do mouse
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow-type");
      const dataString = event.dataTransfer.getData("application/reactflow-data");

      if (typeof type === "undefined" || !type || !reactFlowInstance) {
        return;
      }

      let parsedData = { label: `${type} node` };
      try {
        if (dataString) parsedData = JSON.parse(dataString);
      } catch {
        // Fallback
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: parsedData,
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNode.id);
      toast.success("Novo elemento adicionado ao quadro!");
    },
    [reactFlowInstance, setNodes],
  );

  // Seleção de nó
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Atualização de propriedades do nó
  const handleUpdateNodeData = useCallback(
    (id: string, newData: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: { ...newData },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  // Excluir nó selecionado
  const handleDeleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId),
    );
    setSelectedNodeId(null);
    toast.info("Elemento excluído.");
  }, [selectedNodeId, setNodes, setEdges]);

  // Carregar Template
  const handleLoadTemplate = useCallback(
    (template: FlowTemplate) => {
      setNodes(template.nodes);
      setEdges(template.edges);
      setSelectedNodeId(null);
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    },
    [setNodes, setEdges, fitView],
  );

  // Limpar Quadro
  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    toast.info("Quadro limpo.");
  }, [setNodes, setEdges]);

  // Exportar JSON
  const handleExportJson = useCallback(() => {
    const flow = {
      nodes,
      edges,
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(flow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sig-alpha-fluxo-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Arquivo JSON baixado com sucesso!");
  }, [nodes, edges]);

  // Importar JSON
  const handleImportJson = useCallback(
    (data: { nodes: any[]; edges: any[] }) => {
      setNodes(data.nodes);
      setEdges(data.edges);
      setSelectedNodeId(null);
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    },
    [setNodes, setEdges, fitView],
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] w-full rounded-2xl border border-border bg-background shadow-xs overflow-hidden">
      {/* Barra de Ações Superior */}
      <FlowToolbar
        onLoadTemplate={handleLoadTemplate}
        onClear={handleClear}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onFitView={() => fitView({ padding: 0.2 })}
        nodesCount={nodes.length}
        edgesCount={edges.length}
      />

      {/* Área Principal: Sidebar + Canvas */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Painel Lateral com Elementos Arrastáveis */}
        <FlowSidebar
          selectedNode={selectedNode}
          onUpdateNodeData={handleUpdateNodeData}
          onDeleteSelectedNode={handleDeleteSelectedNode}
        />

        {/* Quadro Interativo ReactFlow */}
        <div ref={reactFlowWrapper} className="flex-1 h-full w-full relative bg-muted/10">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              animated: true,
              style: { strokeWidth: 2 },
            }}
          >
            <Controls className="!bg-card !border-border !shadow-md !rounded-xl overflow-hidden" />
            <MiniMap
              className="!bg-card !border-border !rounded-xl !shadow-md overflow-hidden"
              zoomable
              pannable
              nodeColor={() => "#6366f1"}
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#94a3b8" />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
