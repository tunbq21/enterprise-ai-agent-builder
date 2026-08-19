import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { 
  Play, Brain, Database, Split, Wrench, Activity, AlertOctagon, 
  CheckCircle2, XCircle, Loader2, Settings
} from 'lucide-react';
import { BaseNodeData, NodeType } from '@/types';

const iconMap: Record<NodeType, React.ReactNode> = {
  triggerNode: <Play className="w-4 h-4 text-emerald-500" />,
  llmNode: <Brain className="w-4 h-4 text-purple-500" />,
  memoryNode: <Database className="w-4 h-4 text-blue-500" />,
  routerNode: <Split className="w-4 h-4 text-orange-500" />,
  toolNode: <Wrench className="w-4 h-4 text-gray-500" />,
  workerNode: <Activity className="w-4 h-4 text-pink-500" />,
  sagaNode: <AlertOctagon className="w-4 h-4 text-red-500" />,
};

const borderMap: Record<NodeType, string> = {
  triggerNode: 'border-[#2a2a30] focus:border-amber-500',
  llmNode: 'border-[#2a2a30] focus:border-blue-500',
  memoryNode: 'border-[#2a2a30] focus:border-purple-500',
  routerNode: 'border-[#2a2a30] focus:border-orange-500',
  toolNode: 'border-[#2a2a30] focus:border-emerald-500',
  workerNode: 'border-[#2a2a30] focus:border-pink-500',
  sagaNode: 'border-[#2a2a30] focus:border-rose-500',
};

const bgMap: Record<NodeType, string> = {
  triggerNode: 'bg-[#1f1f23]',
  llmNode: 'bg-[#1f1f23]',
  memoryNode: 'bg-[#1f1f23]',
  routerNode: 'bg-[#1f1f23]',
  toolNode: 'bg-[#1f1f23]',
  workerNode: 'bg-[#1f1f23]',
  sagaNode: 'bg-[#1f1f23]',
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

  return (
    <div
      className={cn(
        "relative flex flex-col min-w-[180px] bg-[#16161a] rounded-lg border shadow-2xl transition-all duration-200 outline-none",
        borderMap[type],
        selected ? "ring-2 ring-offset-4 ring-offset-[#0a0a0b] ring-blue-500 scale-[1.02]" : "hover:border-blue-500/50",
        status === 'running' && "ring-2 ring-blue-500 animate-pulse",
        status === 'error' && "ring-2 ring-rose-500",
        status === 'success' && "ring-2 ring-emerald-500"
      )}
      onClick={(e) => {
        // Prevent default to allow select
      }}
    >
      {/* Settings Button */}
      <div 
        className="absolute -top-3 -right-3 p-1.5 bg-[#1f1f23] border border-[#2a2a30] shadow-sm rounded-full cursor-pointer hover:bg-[#25252b] z-10 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          data.onConfigClick?.();
        }}
        title="Configure Node"
      >
        <Settings className="w-3.5 h-3.5 text-[#888]" />
      </div>

      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3 py-2 border-b border-[#2a2a30] rounded-t-lg", bgMap[type])}>
        {iconMap[type]}
        <div className="flex-1 text-[10px] font-bold text-[#888] uppercase truncate">
          {label}
        </div>
        {/* Status Icon */}
        <div className="ml-2 flex items-center justify-center w-4 h-4">
          {status === 'running' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
          {status === 'success' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          {status === 'error' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 text-[10px] text-[#666] flex flex-col gap-1.5 font-mono">
        {data.config && Object.entries(data.config).slice(0, 2).map(([k, v]) => (
          <div key={k} className="flex justify-between items-center truncate">
            <span className="text-[#666]">{k}:</span>
            <span className="text-[#e0e0e0] truncate ml-2 max-w-[100px]" title={String(v)}>{String(v)}</span>
          </div>
        ))}
        {!data.config || Object.keys(data.config).length === 0 ? (
          <span className="italic text-[#444]">No configuration</span>
        ) : null}
      </div>

      {/* Handles */}
      {inputs > 0 && Array.from({ length: inputs }).map((_, i) => (
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          className="w-4 h-4 bg-blue-600 border-4 border-[#0a0a0b] -ml-2"
          style={{ top: `${(100 / (inputs + 1)) * (i + 1)}%` }}
        />
      ))}
      
      {outputs > 0 && Array.from({ length: outputs }).map((_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          className="w-4 h-4 bg-emerald-500 border-4 border-[#0a0a0b] -mr-2"
          style={{ top: `${(100 / (outputs + 1)) * (i + 1)}%` }}
        />
      ))}
    </div>
  );
}

export const TriggerNode = (props: any) => <NodeWrapper type="triggerNode" inputs={0} outputs={1} {...props} />;
export const LLMNode = (props: any) => <NodeWrapper type="llmNode" inputs={1} outputs={1} {...props} />;
export const MemoryNode = (props: any) => <NodeWrapper type="memoryNode" inputs={1} outputs={1} {...props} />;
export const RouterNode = (props: any) => <NodeWrapper type="routerNode" inputs={1} outputs={2} {...props} />; // Router might have multiple outputs
export const ToolNode = (props: any) => <NodeWrapper type="toolNode" inputs={1} outputs={1} {...props} />;
export const WorkerNode = (props: any) => <NodeWrapper type="workerNode" inputs={1} outputs={1} {...props} />;
export const SagaNode = (props: any) => <NodeWrapper type="sagaNode" inputs={1} outputs={2} {...props} />; // Output & Rollback
