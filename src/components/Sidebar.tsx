import React from 'react';
import { NodeType } from '@/types';
import { Play, Brain, Database, Split, Wrench, Activity, AlertOctagon, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const nodeTypesList: { type: NodeType; label: string; icon: any; color: string, sub: string }[] = [
  { type: 'triggerNode', label: 'Trigger / Input', icon: Play, color: 'text-amber-500 bg-amber-500/20', sub: 'Webhook, Schedule, or Chat' },
  { type: 'llmNode', label: 'LLM Reasoner', icon: Brain, color: 'text-blue-500 bg-blue-500/20', sub: 'Gemini Pro, Claude 3.5' },
  { type: 'memoryNode', label: 'Memory / State', icon: Database, color: 'text-purple-500 bg-purple-500/20', sub: 'Vector DB, Context Graph' },
  { type: 'routerNode', label: 'Logic Router', icon: Split, color: 'text-orange-500 bg-orange-500/20', sub: 'Condition based routing' },
  { type: 'toolNode', label: 'Tool / Action', icon: Wrench, color: 'text-emerald-500 bg-emerald-500/20', sub: 'Python AST, SQL, API' },
  { type: 'workerNode', label: 'Worker Node', icon: Activity, color: 'text-pink-500 bg-pink-500/20', sub: 'CNN, RNN, Multi-modal' },
  { type: 'sagaNode', label: 'Saga Checkpoint', icon: AlertOctagon, color: 'text-rose-500 bg-rose-500/20', sub: 'Transaction Rollback' },
];

export function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-[#0f0f12] border-r border-[#1f1f23] flex flex-col">
      <div className="p-4 border-b border-[#1f1f23]">
        <h2 className="text-[10px] tracking-widest text-[#666] uppercase font-bold">Node Palette</h2>
      </div>
      
      <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1">
        {nodeTypesList.map((node) => (
          <div
            key={node.type}
            onDragStart={(event) => onDragStart(event, node.type, node.label)}
            draggable
            className="group cursor-move bg-[#1a1a1f] border border-[#2a2a30] p-3 rounded-lg hover:border-blue-500/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", node.color)}>
                 <node.icon className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm text-[#e0e0e0]">{node.label}</span>
            </div>
            <p className="text-[10px] text-[#888]">{node.sub}</p>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-[#1f1f23]">
        <div className="text-[10px] uppercase text-[#666] mb-2">Global Settings</div>
        <div className="text-xs text-[#888]">Enterprise Builder v1.0</div>
      </div>
    </div>
  );
}
