import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Sidebar } from './components/Sidebar';
import { BottomPanel } from './components/BottomPanel';
import { ConfigPanel } from './components/ConfigPanel';
import {
  TriggerNode, LLMNode, MemoryNode, RouterNode, ToolNode, WorkerNode, SagaNode
} from './components/CustomNodes';
import { AppNode, LogEntry, ProfilerData, SecurityAlert, NodeType, ExecutionMode } from './types';
import { WorkflowEngine } from './engine/executor';
import { Play, Square, Save, FolderOpen, Zap, Cpu } from 'lucide-react';
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

const STORAGE_KEY = 'enterprise-ai-agent-workflow';

const initialNodes: AppNode[] = [
  {
    id: 'node-1',
    type: 'triggerNode',
    position: { x: 100, y: 150 },
    data: { label: 'User Query', status: 'idle' },
  },
  {
    id: 'node-2',
    type: 'llmNode',
    position: { x: 400, y: 150 },
    data: {
      label: 'Gemini Pro Reasoner',
      status: 'idle',
      config: { model: 'gemini-2.0-flash', strategy: 'ReAct' }
    },
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true }
];

let id = 0;
const getId = () => `dndnode_${id++}`;

function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Load from localStorage if available
  const loadSavedWorkflow = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved);
        return { nodes: savedNodes as AppNode[], edges: savedEdges as Edge[] };
      }
    } catch { /* ignore parse errors */ }
    return null;
  };

  const savedWorkflow = loadSavedWorkflow();
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(savedWorkflow?.nodes ?? initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(savedWorkflow?.edges ?? initialEdges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [profilerData, setProfilerData] = useState<ProfilerData[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [engine, setEngine] = useState<WorkflowEngine | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<ExecutionMode>('simulate');
  const [saveFlash, setSaveFlash] = useState(false);

  // Trigger input dialog state
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [triggerInput, setTriggerInput] = useState('');

  // Hook up configuration click handler
  const nodesWithConfigHandler = nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      onConfigClick: () => setSelectedNodeId(n.id)
    }
  }));

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      const label = event.dataTransfer.getData('application/reactflow-label');
      if (!type) return;
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = { x: event.clientX - bounds.left - 90, y: event.clientY - bounds.top - 30 };
      const newNode: AppNode = { id: getId(), type, position, data: { label, status: 'idle', config: {} } };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const updateNodeStatus = useCallback(
    (nodeId: string, status: AppNode['data']['status']) => {
      setNodes((nds) => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status } } : n));
    },
    [setNodes]
  );

  // Save workflow to localStorage
  const saveWorkflow = () => {
    const toSave = nodes.map(n => ({ ...n, data: { ...n.data, status: 'idle', onConfigClick: undefined } }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: toSave, edges }));
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  };

  // Load workflow from file (JSON)
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
          const { nodes: loadedNodes, edges: loadedEdges } = JSON.parse(ev.target?.result as string);
          setNodes(loadedNodes);
          setEdges(loadedEdges);
        } catch { alert('Invalid workflow file.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const runWorkflow = (input: string) => {
    setLogs([]);
    setProfilerData([]);
    setSecurityAlerts([]);

    const newEngine = new WorkflowEngine(
      nodes,
      edges,
      mode,
      input,
      updateNodeStatus,
      (log) => setLogs(prev => [...prev, log]),
      (data) => setProfilerData(prev => [...prev, data]),
      (alert) => setSecurityAlerts(prev => [...prev, alert]),
      () => setIsRunning(false)
    );

    setEngine(newEngine);
    setIsRunning(true);
    setIsBottomPanelOpen(true);
    newEngine.run();
  };

  const handleRunClick = () => {
    setShowInputDialog(true);
  };

  const stopWorkflow = () => {
    if (engine) {
      engine.stop();
      setIsRunning(false);
      setLogs(prev => [...prev, {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        nodeId: 'system',
        nodeLabel: 'System',
        type: 'warning',
        message: 'Workflow execution stopped by user.'
      }]);
    }
  };

  const updateNodeConfig = (id: string, newConfig: Record<string, any>) => {
    setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n));
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  return (
    <div className="flex h-screen w-full bg-[#0a0a0b] text-[#e0e0e0] overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col relative">
        {/* Top Toolbar */}
        <header className="h-14 bg-[#0f0f12] border-b border-[#1f1f23] flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">A</div>
            <h1 className="text-lg font-semibold tracking-tight text-[#e0e0e0]">
              Enterprise AI Agent <span className="text-blue-500">Lab</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Save / Load */}
            <button
              onClick={saveWorkflow}
              title="Save workflow to browser"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-all ${saveFlash ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-[#1a1a1f] border-[#2a2a30] text-[#888] hover:text-[#e0e0e0] hover:border-[#3a3a40]'}`}
            >
              <Save className="w-3.5 h-3.5" />
              {saveFlash ? 'Saved!' : 'Save'}
            </button>
            <button
              onClick={loadWorkflow}
              title="Load workflow from JSON file"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border bg-[#1a1a1f] border-[#2a2a30] text-[#888] hover:text-[#e0e0e0] hover:border-[#3a3a40] transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Load
            </button>

            {/* Mode Toggle */}
            <div className="flex items-center gap-1.5 bg-[#1a1a1f] border border-[#2a2a30] rounded px-1 py-1">
              <button
                onClick={() => setMode('simulate')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${mode === 'simulate' ? 'bg-blue-600 text-white' : 'text-[#888] hover:text-[#e0e0e0]'}`}
              >
                <Cpu className="w-3.5 h-3.5" />
                Simulate
              </button>
              <button
                onClick={() => setMode('live')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${mode === 'live' ? 'bg-rose-600 text-white' : 'text-[#888] hover:text-[#e0e0e0]'}`}
              >
                <Zap className="w-3.5 h-3.5" />
                Live LLM
              </button>
            </div>

            {/* Run / Stop */}
            {!isRunning ? (
              <>
                <div className="flex items-center bg-[#1a1a1f] px-3 py-1.5 rounded-md border border-[#2a2a30] text-xs gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-green-500 font-mono">SYSTEM READY</span>
                </div>
                <button
                  onClick={handleRunClick}
                  className={`flex items-center gap-2 ${mode === 'live' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-1.5 rounded text-sm font-medium transition-colors`}
                >
                  <Play className="w-4 h-4" /> Run Workflow
                </button>
              </>
            ) : (
              <button
                onClick={stopWorkflow}
                className="flex items-center gap-2 bg-[#1a1a1f] hover:bg-[#25252b] border border-[#2a2a30] text-[#e0e0e0] px-4 py-1.5 rounded text-sm font-medium transition-colors"
              >
                <Square className="w-4 h-4 fill-current text-rose-500" /> Stop
              </button>
            )}
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodesWithConfigHandler}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            className="bg-[#0a0a0b]"
            style={{ backgroundImage: 'radial-gradient(#1f1f23 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          >
            <Background gap={24} color="transparent" />
            <Controls className="bg-[#1a1a1f] border-[#2a2a30]" />
            <MiniMap className="border border-[#2a2a30] rounded-md shadow-sm bg-[#0a0a0b]" nodeColor="#1a1a1f" maskColor="rgba(15, 15, 18, 0.8)" />
          </ReactFlow>
        </div>

        {/* Config Panel */}
        <AnimatePresence>
          {selectedNode && (
            <ConfigPanel
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              onUpdate={updateNodeConfig}
            />
          )}
        </AnimatePresence>

        {/* Bottom Panel */}
        <BottomPanel
          logs={logs}
          profilerData={profilerData}
          securityAlerts={securityAlerts}
          isOpen={isBottomPanelOpen}
          setIsOpen={setIsBottomPanelOpen}
        />
      </div>

      {/* Trigger Input Dialog */}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f0f12] border border-[#2a2a30] rounded-xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-1">
                {mode === 'live'
                  ? <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-mono">🔴 LIVE LLM</span>
                  : <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">🔵 SIMULATED</span>
                }
              </div>
              <h2 className="text-base font-semibold text-[#e0e0e0] mb-1">Run Workflow</h2>
              <p className="text-xs text-[#666] mb-4">Enter the initial input that will be passed to the Trigger Node and through the workflow.</p>
              <textarea
                autoFocus
                value={triggerInput}
                onChange={(e) => setTriggerInput(e.target.value)}
                placeholder={mode === 'live'
                  ? "e.g. Summarize the key risks in our Q3 financial report..."
                  : "e.g. Simulated user query..."
                }
                rows={4}
                className="w-full bg-[#1a1a1f] border border-[#2a2a30] rounded-lg px-3 py-2.5 text-sm text-[#e0e0e0] placeholder-[#444] font-mono focus:outline-none focus:border-blue-500/50 resize-none mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowInputDialog(false)}
                  className="px-4 py-2 text-sm text-[#888] hover:text-[#e0e0e0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowInputDialog(false);
                    runWorkflow(triggerInput);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-white transition-colors ${mode === 'live' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
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
