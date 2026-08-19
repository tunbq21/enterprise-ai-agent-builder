import React, { useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import {
  Play, Brain, Database, Split, Wrench, Activity, AlertOctagon,
  Settings, X, Copy
} from 'lucide-react';
import { BaseNodeData, NodeType } from '@/types';

const iconMap: Record<NodeType, React.ReactNode> = {
  triggerNode: <Play className="w-4 h-4 text-emerald-500" />,
  llmNode: <Brain className="w-4 h-4 text-purple-500" />,
  memoryNode: <Database className="w-4 h-4 text-blue-500" />,
  routerNode: <Split className="w-4 h-4 text-orange-500" />,
  toolNode: <Wrench className="w-4 h-4 text-gray-400" />,
  workerNode: <Activity className="w-4 h-4 text-pink-500" />,
  sagaNode: <AlertOctagon className="w-4 h-4 text-red-500" />,
};

const accentMap: Record<NodeType, string> = {
  triggerNode: 'group-hover:border-amber-500/60',
  llmNode: 'group-hover:border-purple-500/60',
  memoryNode: 'group-hover:border-blue-500/60',
  routerNode: 'group-hover:border-orange-500/60',
  toolNode: 'group-hover:border-emerald-500/60',
  workerNode: 'group-hover:border-pink-500/60',
  sagaNode: 'group-hover:border-rose-500/60',
};

const statusRing: Record<string, string> = {
  running: 'ring-2 ring-blue-500 animate-pulse',
  error: 'ring-2 ring-rose-500',
  success: 'ring-2 ring-emerald-500',
};

interface NodeWrapperProps {
  type: NodeType;
  data: BaseNodeData;
  selected?: boolean;
  inputs?: number;
  outputs?: number;
}

function NodeWrapper({ type, data, selected, inputs = 1, outputs = 1 }: NodeWrapperProps) {
  const { status = 'idle', label } = data;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn(
        'group relative flex flex-col min-w-[185px] bg-[#16161a] rounded-lg border border-[#2a2a30] shadow-2xl transition-all duration-200 outline-none cursor-default',
        accentMap[type],
        selected && 'ring-2 ring-offset-2 ring-offset-[#0a0a0b] ring-blue-500 scale-[1.02] border-blue-500/50',
        statusRing[status] ?? ''
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Action Buttons (visible on hover) ── */}
      <div className={cn(
        'absolute -top-3 right-1 flex gap-1 transition-all duration-150',
        hovered || selected ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
      )}>
        {/* Duplicate */}
        <button
          className="p-1 bg-[#1f1f23] border border-[#2a2a30] shadow rounded-full hover:bg-[#2a2a30] hover:border-blue-500/50 transition-colors z-10"
          title="Duplicate node"
          onClick={(e) => { e.stopPropagation(); data.onDuplicateClick?.(); }}
        >
          <Copy className="w-3 h-3 text-[#888] hover:text-blue-400" />
        </button>
        {/* Configure */}
        <button
          className="p-1 bg-[#1f1f23] border border-[#2a2a30] shadow rounded-full hover:bg-[#2a2a30] hover:border-blue-500/50 transition-colors z-10"
          title="Configure node (⚙️)"
          onClick={(e) => { e.stopPropagation(); data.onConfigClick?.(); }}
        >
          <Settings className="w-3 h-3 text-[#888] hover:text-blue-400" />
        </button>
        {/* Delete */}
        <button
          className="p-1 bg-[#1f1f23] border border-[#2a2a30] shadow rounded-full hover:bg-rose-500/20 hover:border-rose-500/50 transition-colors z-10"
          title="Delete node (Del)"
          onClick={(e) => { e.stopPropagation(); data.onDeleteClick?.(); }}
        >
          <X className="w-3 h-3 text-[#888] hover:text-rose-400" />
        </button>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2a30] rounded-t-lg bg-[#1f1f23]">
        {iconMap[type]}
        <div className="flex-1 text-[10px] font-bold text-[#888] uppercase truncate tracking-wider">
          {label}
        </div>
        {/* Status dot */}
        <div className="w-4 h-4 flex items-center justify-center">
          {status === 'running' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
          {status === 'success' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          {status === 'error' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
          {status === 'idle' && <span className="w-2 h-2 rounded-full bg-[#333]" />}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-3 text-[10px] text-[#555] flex flex-col gap-1.5 font-mono min-h-[36px]">
        {data.config && Object.entries(data.config).slice(0, 2).map(([k, v]) => (
          <div key={k} className="flex justify-between items-center">
            <span className="text-[#555]">{k}:</span>
            <span className="text-[#aaa] truncate ml-2 max-w-[105px]" title={String(v)}>{String(v)}</span>
          </div>
        ))}
        {(!data.config || Object.keys(data.config).length === 0) && (
          <span className="italic text-[#333]">No config — click ⚙️ to set</span>
        )}
      </div>

      {/* ── Input Handles ── */}
      {inputs > 0 && Array.from({ length: inputs }).map((_, i) => (
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          className="!w-3.5 !h-3.5 !bg-blue-600 !border-2 !border-[#0a0a0b] hover:!scale-125 transition-transform"
          style={{ top: `${(100 / (inputs + 1)) * (i + 1)}%` }}
          title="Input — drag an edge here"
        />
      ))}

      {/* ── Output Handles ── */}
      {outputs > 0 && Array.from({ length: outputs }).map((_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          className="!w-3.5 !h-3.5 !bg-emerald-500 !border-2 !border-[#0a0a0b] hover:!scale-125 transition-transform"
          style={{ top: `${(100 / (outputs + 1)) * (i + 1)}%` }}
          title={i === 1 ? 'Output (rollback path)' : 'Output — drag to connect'}
        />
      ))}
    </div>
  );
}

export const TriggerNode = (props: any) => <NodeWrapper type="triggerNode" inputs={0} outputs={1} {...props} />;
export const LLMNode     = (props: any) => <NodeWrapper type="llmNode"     inputs={1} outputs={1} {...props} />;
export const MemoryNode  = (props: any) => <NodeWrapper type="memoryNode"  inputs={1} outputs={1} {...props} />;
export const RouterNode  = (props: any) => <NodeWrapper type="routerNode"  inputs={1} outputs={2} {...props} />;
export const ToolNode    = (props: any) => <NodeWrapper type="toolNode"    inputs={1} outputs={1} {...props} />;
export const WorkerNode  = (props: any) => <NodeWrapper type="workerNode"  inputs={1} outputs={1} {...props} />;
export const SagaNode    = (props: any) => <NodeWrapper type="sagaNode"    inputs={1} outputs={2} {...props} />;
