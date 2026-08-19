import React from 'react';
import { AppNode } from '@/types';
import { X, Settings2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ConfigPanelProps {
  node: AppNode | null;
  onClose: () => void;
  onUpdate: (id: string, newConfig: Record<string, any>) => void;
}

export function ConfigPanel({ node, onClose, onUpdate }: ConfigPanelProps) {
  if (!node) return null;

  const handleUpdate = (key: string, value: any) => {
    onUpdate(node.id, { ...node.data.config, [key]: value });
  };

  const config = node.data.config || {};

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="absolute top-0 right-0 bottom-0 w-80 bg-[#0f0f12] border-l border-[#1f1f23] shadow-2xl z-30 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-[#1f1f23] bg-[#0f0f12]">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[#888]" />
          <h3 className="text-[10px] uppercase font-bold text-[#666] tracking-widest">{node.data.label}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-[#1a1a1f] rounded text-[#888] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        
        {node.type === 'llmNode' && (
          <>
            <Field label="Model" value={config.model || 'gemini-pro'} onChange={(v) => handleUpdate('model', v)} type="select" options={['gemini-1.5-pro', 'gemini-1.5-flash', 'claude-3-opus']} />
            <Field label="Strategy" value={config.strategy || 'ReAct'} onChange={(v) => handleUpdate('strategy', v)} type="select" options={['ReAct', 'Plan & Execute', 'Direct']} />
            <Field label="System Prompt" value={config.systemPrompt || ''} onChange={(v) => handleUpdate('systemPrompt', v)} type="textarea" />
            <Field label="Temperature" value={config.temperature || 0.7} onChange={(v) => handleUpdate('temperature', parseFloat(v))} type="number" step="0.1" min="0" max="1" />
          </>
        )}

        {node.type === 'memoryNode' && (
          <>
            <Field label="Type" value={config.type || 'Vector DB'} onChange={(v) => handleUpdate('type', v)} type="select" options={['Vector DB', 'Graph DB', 'Passive Context']} />
            <Field label="Spreading Activation" value={config.spreading || false} onChange={(v) => handleUpdate('spreading', v)} type="checkbox" />
            <Field label="Compaction Strategy" value={config.compaction || 'Greedy'} onChange={(v) => handleUpdate('compaction', v)} type="select" options={['Greedy', 'Summarize', 'FIFO']} />
          </>
        )}

        {node.type === 'toolNode' && (
          <>
            <Field label="Tool Type" value={config.toolType || 'AST Sandbox'} onChange={(v) => handleUpdate('toolType', v)} type="select" options={['AST Sandbox', 'SQL DB', 'Web Search', 'REST API']} />
            <Field label="JSON Schema" value={config.schema || '{}'} onChange={(v) => handleUpdate('schema', v)} type="textarea" />
          </>
        )}

        {node.type === 'workerNode' && (
          <>
            <Field label="Architecture" value={config.arch || 'ResNet-50'} onChange={(v) => handleUpdate('arch', v)} type="select" options={['ResNet-50', 'LSTM', 'Transformer', 'YOLOv8']} />
          </>
        )}

         {node.type === 'routerNode' && (
          <>
             <Field label="Condition 1" value={config.cond1 || 'payload.type == "image"'} onChange={(v) => handleUpdate('cond1', v)} type="text" />
             <Field label="Route 1 To" value={config.route1 || 'WorkerNode'} onChange={(v) => handleUpdate('route1', v)} type="text" />
          </>
        )}
        
        {/* Generic fallback for others or no specific config */}
        {['triggerNode', 'sagaNode'].includes(node.type) && (
          <div className="text-sm text-[#666] italic">No specific configuration available for this node type.</div>
        )}

      </div>
    </motion.div>
  );
}

function Field({ label, value, onChange, type, options, ...props }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-[#666] uppercase">{label}</label>
      {type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-[#2a2a30] rounded bg-[#1a1a1f] text-[#e0e0e0] focus:border-blue-500/50 outline-none">
          {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-[#2a2a30] rounded min-h-[80px] bg-[#1a1a1f] text-[#e0e0e0] focus:border-blue-500/50 outline-none font-mono" {...props} />
      ) : type === 'checkbox' ? (
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-blue-600 bg-[#1a1a1f] border-[#2a2a30]" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-[#2a2a30] rounded bg-[#1a1a1f] text-[#e0e0e0] focus:border-blue-500/50 outline-none font-mono" {...props} />
      )}
    </div>
  );
}
