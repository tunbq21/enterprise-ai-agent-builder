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
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Sidebar } from './components/Sidebar';
import { BottomPanel } from './components/BottomPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { 
  TriggerNode, LLMNode, MemoryNode, RouterNode, ToolNode, WorkerNode, SagaNode 
} from './components/CustomNodes';
import { AppNode, LogEntry, ProfilerData, NodeType } from './types';
import { WorkflowEngine } from './engine/executor';
import { Play, Square } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

const nodeTypes = {
  triggerNode: TriggerNode,
  llmNode: LLMNode,
  memoryNode: MemoryNode,
  routerNode: RouterNode,
  toolNode: ToolNode,
  workerNode: WorkerNode,
  sagaNode: SagaNode,
};

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
      config: { model: 'gemini-1.5-pro', strategy: 'ReAct' } 
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
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [profilerData, setProfilerData] = useState<ProfilerData[]>([]);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [engine, setEngine] = useState<WorkflowEngine | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Hook up configuration click handler for nodes
  const nodesWithConfigHandler = nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      onConfigClick: () => setSelectedNodeId(n.id)
    }
  }));

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      const label = event.dataTransfer.getData('application/reactflow-label');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 90, // offset
        y: event.clientY - reactFlowBounds.top - 30, // offset
      };

      const newNode: AppNode = {
        id: getId(),
        type,
        position,
        data: { label, status: 'idle', config: {} },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const updateNodeStatus = useCallback((nodeId: string, status: AppNode['data']['status']) => {
    setNodes((nds) => 
      nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status } } : n)
    );
  }, [setNodes]);

  const runWorkflow = () => {
    setLogs([]);
    setProfilerData([]);
    
    const newEngine = new WorkflowEngine(
      nodes,
      edges,
      updateNodeStatus,
      (log) => setLogs(prev => [...prev, log]),
      (data) => setProfilerData(prev => [...prev, data]),
      () => setIsRunning(false)
    );
    
    setEngine(newEngine);
    setIsRunning(true);
    setIsBottomPanelOpen(true);
    newEngine.run();
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
            <h1 className="text-lg font-semibold tracking-tight text-[#e0e0e0]">Enterprise AI Agent <span className="text-blue-500">Lab</span></h1>
          </div>
          <div className="flex items-center gap-4">
             {!isRunning ? (
                <>
                  <div className="flex items-center bg-[#1a1a1f] px-3 py-1.5 rounded-md border border-[#2a2a30] text-xs gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-green-500 font-mono">SYSTEM READY</span>
                  </div>
                  <button 
                    onClick={runWorkflow}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
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

        {/* Canvas Area */}
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

        {/* Floating Panels */}
        <AnimatePresence>
          {selectedNode && (
            <ConfigPanel 
              node={selectedNode} 
              onClose={() => setSelectedNodeId(null)} 
              onUpdate={updateNodeConfig} 
            />
          )}
        </AnimatePresence>

        <BottomPanel 
          logs={logs} 
          profilerData={profilerData} 
          isOpen={isBottomPanelOpen} 
          setIsOpen={setIsBottomPanelOpen} 
        />
      </div>
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
