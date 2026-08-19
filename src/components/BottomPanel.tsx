import React, { useState } from 'react';
import { LogEntry, ProfilerData } from '@/types';
import { Terminal, Activity, ShieldAlert, ChevronDown, ChevronUp, Clock, Cpu, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface BottomPanelProps {
  logs: LogEntry[];
  profilerData: ProfilerData[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function BottomPanel({ logs, profilerData, isOpen, setIsOpen }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'profiler' | 'security'>('console');

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#0f0f12] border-t border-[#1f1f23] shadow-2xl z-40 flex flex-col transition-all duration-300">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-4 bg-[#0f0f12] border-b border-[#1f1f23] h-10">
        <div className="flex space-x-1">
          <TabButton 
            active={activeTab === 'console'} 
            onClick={() => { setActiveTab('console'); setIsOpen(true); }}
            icon={<Terminal className="w-4 h-4" />}
            label="Console / Logs"
          />
          <TabButton 
            active={activeTab === 'profiler'} 
            onClick={() => { setActiveTab('profiler'); setIsOpen(true); }}
            icon={<Activity className="w-4 h-4" />}
            label="Profiler"
          />
          <TabButton 
            active={activeTab === 'security'} 
            onClick={() => { setActiveTab('security'); setIsOpen(true); }}
            icon={<ShieldAlert className="w-4 h-4" />}
            label="Security (AST)"
          />
        </div>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-[#1a1a1f] rounded text-[#888] transition-colors"
        >
          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>

      {/* Content Area */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 250 }}
            exit={{ height: 0 }}
            className="flex-1 overflow-hidden"
          >
            <div className="h-full overflow-y-auto p-4 bg-[#0f0f12] font-mono text-sm border-t border-[#1f1f23]">
              {activeTab === 'console' && <ConsoleView logs={logs} />}
              {activeTab === 'profiler' && <ProfilerView data={profilerData} />}
              {activeTab === 'security' && <SecurityView />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center space-x-2 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors border border-transparent",
        active ? "bg-[#16161a] text-blue-500 border-[#1f1f23] border-b-[#16161a] translate-y-[1px]" : "text-[#888] hover:bg-[#1a1a1f] hover:text-[#e0e0e0]"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ConsoleView({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) return <div className="text-[#666] italic">No logs yet. Run the workflow.</div>;
  
  return (
    <div className="flex flex-col space-y-1 text-[10px]">
      {logs.map((log) => (
        <div key={log.id} className="flex space-x-3 group">
          <span className="text-[#666] shrink-0">[{new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12)}]</span>
          <span className="text-blue-500 font-semibold w-24 shrink-0 truncate">[{log.nodeLabel}]</span>
          <span className={cn(
            "flex-1",
            log.type === 'error' ? "text-rose-500" :
            log.type === 'success' ? "text-emerald-500" :
            log.type === 'warning' ? "text-amber-500" : "text-[#e0e0e0]"
          )}>
            {log.message}
            {log.payload && (
              <span className="ml-2 text-[#666] hidden group-hover:inline">
                {JSON.stringify(log.payload)}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProfilerView({ data }: { data: ProfilerData[] }) {
  if (data.length === 0) return <div className="text-[#666] italic">No profiling data. Run the workflow.</div>;
  
  return (
    <div className="grid gap-2 text-[10px]">
      {data.map((d, i) => (
        <div key={i} className="flex items-center space-x-4 bg-[#16161a] border border-[#1f1f23] p-2 rounded">
          <span className="text-blue-500 font-bold w-32 truncate uppercase">{d.nodeLabel}</span>
          <div className="flex space-x-6 flex-1 text-[#aaa]">
            <span className="flex items-center space-x-1"><Clock className="w-3 h-3 text-[#666]"/> <span>{d.latencyMs}ms</span></span>
            {d.tokensUsed && <span className="flex items-center space-x-1"><Activity className="w-3 h-3 text-purple-500"/> <span>{d.tokensUsed} tokens</span></span>}
            {d.bigO && <span className="flex items-center space-x-1"><Zap className="w-3 h-3 text-amber-500"/> <span>{d.bigO}</span></span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SecurityView() {
  return (
    <div className="text-[#e0e0e0]">
      <div className="flex items-center space-x-2 text-emerald-500 mb-2">
        <ShieldAlert className="w-5 h-5" />
        <span className="font-semibold text-xs">AST Guardrails Active</span>
      </div>
      <p className="text-[#888] text-[10px] mb-4">All dynamic code nodes are sandboxed. PII masking is enabled.</p>
      
      <div className="text-[10px] text-[#666] border-l-2 border-[#1f1f23] pl-3">
        [System] Blocked opcodes: `os.system`, `subprocess`, `eval`, `exec`
      </div>
    </div>
  );
}
