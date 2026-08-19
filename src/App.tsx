import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  ReactFlowProvider,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Sidebar } from './components/Sidebar';
import { BottomPanel } from './components/BottomPanel';
import { ConfigPanel } from './components/ConfigPanel';
import {
  TriggerNode, LLMNode, MemoryNode, RouterNode, ToolNode, WorkerNode, SagaNode
} from './components/CustomNodes';
import { DeletableEdge } from './components/CustomEdge';
import { AppNode, LogEntry, ProfilerData, SecurityAlert, NodeType, ExecutionMode } from './types';
import { WorkflowEngine } from './engine/executor';
import { Play, Square, Save, FolderOpen, Zap, Cpu, Info, Copy, Trash2, Settings2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const nodeTypes = {
  triggerNode: TriggerNode,
  llmNode: LLMNode,
  memoryNode: MemoryNode,
  routerNode: RouterNode,
  toolNode: ToolNode,
  workerNode: WorkerNode,
  sagaNode: SagaNode,
};

const edgeTypes = {
  default: DeletableEdge,
};

const STORAGE_KEY = 'enterprise-ai-agent-workflow';

const initialNodes: AppNode[] = [
  {
    id: 'node-1',
    type: 'triggerNode',
    position: { x: 100, y: 180 },
    data: { label: 'User Query', status: 'idle' },
  },
  {
    id: 'node-2',
    type: 'llmNode',
    position: { x: 420, y: 180 },
    data: {
      label: 'Gemini Pro Reasoner',
      status: 'idle',
      config: { model: 'gemini-2.0-flash', strategy: 'ReAct' }
    },
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', type: 'default' }
];

let nodeCounter = 10;
const getNewId = () => `node_${nodeCounter++}`;

// ─── Context Menu ────────────────────────────────────────────────────────────
interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
  onConfigure: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ContextMenu({ x, y, onClose, onConfigure, onDuplicate, onDelete }: ContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ top: y, left: x }}
        className="fixed z-50 bg-[#1a1a1f] border border-[#2a2a30] rounded-lg shadow-2xl py-1 min-w-[160px]"
      >
        <button onClick={() => { onConfigure(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#ccc] hover:bg-[#25252b] hover:text-[#fff] transition-colors">
          <Settings2 className="w-3.5 h-3.5 text-blue-400" /> Configure
        </button>
        <button onClick={() => { onDuplicate(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#ccc] hover:bg-[#25252b] hover:text-[#fff] transition-colors">
          <Copy className="w-3.5 h-3.5 text-emerald-400" /> Duplicate
        </button>
        <div className="border-t border-[#2a2a30] my-1" />
        <button onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </motion.div>
    </>
  );
}

// ─── Shortcut Hints Bar ───────────────────────────────────────────────────────
function HintsBar() {
  const hints = [
    { key: 'Drag from palette', desc: 'Add node' },
    { key: 'Drag handle → handle', desc: 'Connect nodes' },
    { key: 'Click node', desc: 'Select / move' },
    { key: 'Hover node', desc: 'Show actions' },
    { key: 'Del / Backspace', desc: 'Remove selected' },
    { key: 'Click edge → X', desc: 'Remove edge' },
    { key: 'Scroll', desc: 'Zoom canvas' },
  ];
  return (
    <div className="absolute bottom-[291px] left-0 right-0 h-7 bg-[#0a0a0b]/80 backdrop-blur-sm border-t border-[#1f1f23] z-30 flex items-center gap-5 px-5 overflow-x-auto">
      <Info className="w-3 h-3 text-[#444] shrink-0" />
      {hints.map((h) => (
        <span key={h.key} className="text-[9px] text-[#555] shrink-0 flex gap-1.5 items-center">
          <kbd className="bg-[#1a1a1f] border border-[#2a2a30] px-1.5 py-0.5 rounded text-[9px] text-[#888]">{h.key}</kbd>
          <span>{h.desc}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Main Canvas ──────────────────────────────────────────────────────────────
function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Load from localStorage
  const getSavedWorkflow = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { nodes: n, edges: e } = JSON.parse(saved);
        return { nodes: n as AppNode[], edges: e as Edge[] };
      }
    } catch { /* ignore */ }
    return null;
  };

  const saved = getSavedWorkflow();
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(saved?.nodes ?? initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(saved?.edges ?? initialEdges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [profilerData, setProfilerData] = useState<ProfilerData[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [engine, setEngine] = useState<WorkflowEngine | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<ExecutionMode>('simulate');
  const [saveFlash, setSaveFlash] = useState(false);
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [triggerInput, setTriggerInput] = useState('');

  // ── Helpers ──
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [setNodes, setEdges, selectedNodeId]);

  const duplicateNode = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const src = nds.find((n) => n.id === nodeId);
      if (!src) return nds;
      const copy: AppNode = {
        ...src,
        id: getNewId(),
        position: { x: src.position.x + 30, y: src.position.y + 30 },
        data: { ...src.data, label: src.data.label + ' (copy)', status: 'idle' },
        selected: false,
      };
      return [...nds, copy];
    });
  }, [setNodes]);

  const updateNodeStatus = useCallback((nodeId: string, status: AppNode['data']['status']) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, status } } : n));
  }, [setNodes]);

  const updateNodeConfig = (id: string, newConfig: Record<string, any>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n));
  };

  // Attach all node handlers
  const nodesWithHandlers = nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      onConfigClick:    () => setSelectedNodeId(n.id),
      onDeleteClick:    () => deleteNode(n.id),
      onDuplicateClick: () => duplicateNode(n.id),
    },
  }));

  // ── ReactFlow Events ──
  const onConnect = useCallback((params: Connection | Edge) =>
    setEdges((eds) => addEdge({ ...params, type: 'default' }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow') as NodeType;
    const label = e.dataTransfer.getData('application/reactflow-label');
    if (!type || !reactFlowInstance) return;
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;
    const position = reactFlowInstance.screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    const newNode: AppNode = {
      id: getNewId(),
      type,
      position,
      data: { label, status: 'idle', config: {} },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes, reactFlowInstance]);

  // Right-click context menu on node
  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  // ── Save / Load ──
  const saveWorkflow = () => {
    const toSave = nodes.map((n) => ({
      ...n,
      data: { ...n.data, status: 'idle', onConfigClick: undefined, onDeleteClick: undefined, onDuplicateClick: undefined },
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: toSave, edges }));
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  };

  const exportWorkflow = () => {
    const toExport = nodes.map((n) => ({
      ...n,
      data: { ...n.data, status: 'idle', onConfigClick: undefined, onDeleteClick: undefined, onDuplicateClick: undefined },
    }));
    const blob = new Blob([JSON.stringify({ nodes: toExport, edges }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadWorkflow = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const { nodes: n, edges: ed } = JSON.parse(ev.target?.result as string);
          setNodes(n);
          setEdges(ed);
        } catch { alert('Invalid workflow JSON file.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ── Run / Stop ──
  const runWorkflow = (input: string) => {
    setLogs([]);
    setProfilerData([]);
    setSecurityAlerts([]);

    const newEngine = new WorkflowEngine(
      nodes, edges, mode, input,
      updateNodeStatus,
      (log) => setLogs((prev) => [...prev, log]),
      (data) => setProfilerData((prev) => [...prev, data]),
      (alert) => setSecurityAlerts((prev) => [...prev, alert]),
      () => setIsRunning(false)
    );

    setEngine(newEngine);
    setIsRunning(true);
    setIsBottomPanelOpen(true);
    newEngine.run();
  };

  const stopWorkflow = () => {
    engine?.stop();
    setIsRunning(false);
    setLogs((prev) => [...prev, {
      id: crypto.randomUUID(), timestamp: Date.now(),
      nodeId: 'system', nodeLabel: 'System',
      type: 'warning', message: 'Workflow execution stopped by user.',
    }]);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const contextNode = contextMenu ? nodes.find((n) => n.id === contextMenu.nodeId) : null;

  return (
    <div className="flex h-screen w-full bg-[#0a0a0b] text-[#e0e0e0] overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col relative">
        {/* ── Top Toolbar ── */}
        <header className="h-14 bg-[#0f0f12] border-b border-[#1f1f23] flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-sm">A</div>
            <h1 className="text-lg font-semibold tracking-tight">
              Enterprise AI Agent <span className="text-blue-500">Lab</span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Save / Export / Load */}
            <button onClick={saveWorkflow} title="Auto-save to browser"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-all ${saveFlash ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-[#1a1a1f] border-[#2a2a30] text-[#888] hover:text-[#e0e0e0] hover:border-[#3a3a40]'}`}>
              <Save className="w-3.5 h-3.5" />{saveFlash ? 'Saved!' : 'Save'}
            </button>
            <button onClick={exportWorkflow} title="Export workflow as JSON"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border bg-[#1a1a1f] border-[#2a2a30] text-[#888] hover:text-[#e0e0e0] hover:border-[#3a3a40] transition-colors">
              ↓ Export
            </button>
            <button onClick={loadWorkflow} title="Import workflow JSON"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border bg-[#1a1a1f] border-[#2a2a30] text-[#888] hover:text-[#e0e0e0] hover:border-[#3a3a40] transition-colors">
              <FolderOpen className="w-3.5 h-3.5" /> Load
            </button>

            <div className="w-px h-5 bg-[#2a2a30]" />

            {/* Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#1a1a1f] border border-[#2a2a30] rounded px-1 py-1">
              <button onClick={() => setMode('simulate')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${mode === 'simulate' ? 'bg-blue-600 text-white' : 'text-[#888] hover:text-[#e0e0e0]'}`}>
                <Cpu className="w-3.5 h-3.5" /> Simulate
              </button>
              <button onClick={() => setMode('live')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${mode === 'live' ? 'bg-rose-600 text-white' : 'text-[#888] hover:text-[#e0e0e0]'}`}>
                <Zap className="w-3.5 h-3.5" /> Live LLM
              </button>
            </div>

            {/* Run / Stop */}
            {!isRunning ? (
              <>
                <div className="flex items-center bg-[#1a1a1f] px-2.5 py-1.5 rounded border border-[#2a2a30] text-xs gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-500 font-mono">READY</span>
                </div>
                <button onClick={() => setShowInputDialog(true)}
                  className={`flex items-center gap-2 ${mode === 'live' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-1.5 rounded text-sm font-medium transition-colors`}>
                  <Play className="w-4 h-4" /> Run
                </button>
              </>
            ) : (
              <button onClick={stopWorkflow}
                className="flex items-center gap-2 bg-[#1a1a1f] hover:bg-[#25252b] border border-[#2a2a30] px-4 py-1.5 rounded text-sm font-medium transition-colors">
                <Square className="w-4 h-4 fill-current text-rose-500" /> Stop
              </button>
            )}
          </div>
        </header>

        {/* ── Canvas ── */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodesWithHandlers}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeContextMenu={onNodeContextMenu}
            deleteKeyCode={['Delete', 'Backspace']}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            className="bg-[#0a0a0b]"
            style={{
              backgroundImage: 'radial-gradient(#1a1a20 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            <Background gap={24} color="transparent" />
            <Controls className="bg-[#1a1a1f] border-[#2a2a30]" />
            <MiniMap
              className="border border-[#2a2a30] rounded-md shadow-sm bg-[#0a0a0b]"
              nodeColor="#1a1a1f"
              maskColor="rgba(15, 15, 18, 0.8)"
            />
          </ReactFlow>

          {/* Hint bar above bottom panel */}
          <HintsBar />
        </div>

        {/* ── Config Panel ── */}
        <AnimatePresence>
          {selectedNode && (
            <ConfigPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} onUpdate={updateNodeConfig} />
          )}
        </AnimatePresence>

        {/* ── Bottom Panel ── */}
        <BottomPanel
          logs={logs}
          profilerData={profilerData}
          securityAlerts={securityAlerts}
          isOpen={isBottomPanelOpen}
          setIsOpen={setIsBottomPanelOpen}
        />
      </div>

      {/* ── Right-click Context Menu ── */}
      <AnimatePresence>
        {contextMenu && contextNode && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            onClose={() => setContextMenu(null)}
            onConfigure={() => setSelectedNodeId(contextMenu.nodeId)}
            onDuplicate={() => duplicateNode(contextMenu.nodeId)}
            onDelete={() => deleteNode(contextMenu.nodeId)}
          />
        )}
      </AnimatePresence>

      {/* ── Trigger Input Dialog ── */}
      <AnimatePresence>
        {showInputDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowInputDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-[#0f0f12] border border-[#2a2a30] rounded-xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-2">
                {mode === 'live'
                  ? <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-mono">🔴 LIVE LLM MODE</span>
                  : <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">🔵 SIMULATE MODE</span>
                }
              </div>
              <h2 className="text-base font-semibold text-[#e0e0e0] mb-1">Trigger Input</h2>
              <p className="text-xs text-[#555] mb-4">
                This text will be passed as the initial payload through all nodes.
              </p>
              <textarea
                autoFocus
                value={triggerInput}
                onChange={(e) => setTriggerInput(e.target.value)}
                placeholder={mode === 'live'
                  ? 'e.g. Summarize the key risks in our Q3 financial report...'
                  : 'e.g. Hello, this is a test simulation...'}
                rows={4}
                className="w-full bg-[#1a1a1f] border border-[#2a2a30] rounded-lg px-3 py-2.5 text-sm text-[#e0e0e0] placeholder-[#444] font-mono focus:outline-none focus:border-blue-500/50 resize-none mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowInputDialog(false)}
                  className="px-4 py-2 text-sm text-[#888] hover:text-[#e0e0e0] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => { setShowInputDialog(false); runWorkflow(triggerInput); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-white transition-colors ${mode === 'live' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  <Play className="w-4 h-4" />
                  {mode === 'live' ? 'Run with Gemini' : 'Run Simulation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
