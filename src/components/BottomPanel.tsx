import React, { useState, useRef, useEffect } from 'react';
import { LogEntry, ProfilerData, SecurityAlert } from '@/types';
import { Terminal, Activity, ShieldAlert, ChevronDown, ChevronUp, Clock, Zap, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface BottomPanelProps {
  logs: LogEntry[];
  profilerData: ProfilerData[];
  securityAlerts: SecurityAlert[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function BottomPanel({ logs, profilerData, securityAlerts, isOpen, setIsOpen }: BottomPanelProps) {
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
            badge={logs.filter(l => l.type === 'error').length}
          />
          <TabButton
            active={activeTab === 'profiler'}
            onClick={() => { setActiveTab('profiler'); setIsOpen(true); }}
            icon={<Activity className="w-4 h-4" />}
            label="Profiler"
            badge={profilerData.length}
          />
          <TabButton
            active={activeTab === 'security'}
            onClick={() => { setActiveTab('security'); setIsOpen(true); }}
            icon={<ShieldAlert className="w-4 h-4" />}
            label="Security (AST)"
            badge={securityAlerts.filter(a => a.type !== 'ok').length}
            badgeColor="amber"
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
              {activeTab === 'security' && <SecurityView alerts={securityAlerts} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active, onClick, icon, label, badge = 0, badgeColor = 'rose'
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  badgeColor?: 'rose' | 'amber';
}) {
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
      {badge > 0 && (
        <span className={cn(
          "ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
          badgeColor === 'rose' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

function ConsoleView({ logs }: { logs: LogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (logs.length === 0) return <div className="text-[#666] italic text-xs">No logs yet. Run the workflow.</div>;

  return (
    <div className="flex flex-col space-y-1 text-[10px]">
      {logs.map((log) => (
        <div key={log.id} className="flex space-x-3 group">
          <span className="text-[#666] shrink-0">[{new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12)}]</span>
          <span className="text-blue-500 font-semibold w-24 shrink-0 truncate">[{log.nodeLabel}]</span>
          <span className={cn(
            "flex-1 break-all",
            log.type === 'error' ? "text-rose-500" :
            log.type === 'success' ? "text-emerald-500" :
            log.type === 'warning' ? "text-amber-500" : "text-[#e0e0e0]"
          )}>
            {log.message}
            {log.payload && (
              <span className="ml-2 text-[#555] hidden group-hover:inline">
                {JSON.stringify(log.payload).slice(0, 200)}
              </span>
            )}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function ProfilerView({ data }: { data: ProfilerData[] }) {
  if (data.length === 0) return <div className="text-[#666] italic text-xs">No profiling data. Run the workflow.</div>;

  const totalLatency = data.reduce((acc, d) => acc + d.latencyMs, 0);
  const totalTokens = data.reduce((acc, d) => acc + (d.tokensUsed ?? 0), 0);

  return (
    <div className="flex flex-col gap-2 text-[10px]">
      {/* Summary row */}
      <div className="flex gap-4 mb-2 text-[10px] text-[#888] border-b border-[#1f1f23] pb-2">
        <span>Total latency: <span className="text-amber-400 font-bold">{totalLatency}ms</span></span>
        {totalTokens > 0 && <span>Total tokens: <span className="text-purple-400 font-bold">{totalTokens}</span></span>}
        <span>Nodes executed: <span className="text-emerald-400 font-bold">{data.length}</span></span>
      </div>
      {data.map((d, i) => (
        <div key={i} className="flex items-center space-x-4 bg-[#16161a] border border-[#1f1f23] p-2 rounded">
          <span className="text-blue-500 font-bold w-32 truncate uppercase">{d.nodeLabel}</span>
          <div className="flex-1 bg-[#1a1a1f] rounded-full h-1.5 mr-2">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, (d.latencyMs / Math.max(totalLatency, 1)) * 100 * data.length)}%` }}
            />
          </div>
          <div className="flex space-x-4 text-[#aaa]">
            <span className="flex items-center space-x-1"><Clock className="w-3 h-3 text-[#666]" /><span>{d.latencyMs}ms</span></span>
            {d.tokensUsed && <span className="flex items-center space-x-1"><Activity className="w-3 h-3 text-purple-500" /><span>{d.tokensUsed} tk</span></span>}
            {d.bigO && <span className="flex items-center space-x-1"><Zap className="w-3 h-3 text-amber-500" /><span>{d.bigO}</span></span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SecurityView({ alerts }: { alerts: SecurityAlert[] }) {
  return (
    <div className="flex flex-col gap-2 text-[10px]">
      {/* Static guardrail header */}
      <div className="flex items-center gap-2 text-emerald-500 mb-1">
        <ShieldAlert className="w-4 h-4" />
        <span className="font-semibold text-xs">AST Guardrails Active</span>
        <span className="text-[#555] ml-auto">Blocked opcodes: os.system, subprocess, eval, exec</span>
      </div>

      {alerts.length === 0 && (
        <div className="text-[#555] italic">No security events yet. Run the workflow to see live alerts.</div>
      )}

      {alerts.map((alert) => (
        <div key={alert.id} className={cn(
          "flex items-start gap-2 p-2 rounded border",
          alert.type === 'pii' ? "bg-amber-500/10 border-amber-500/30" :
          alert.type === 'blocked' ? "bg-rose-500/10 border-rose-500/30" :
          "bg-emerald-500/10 border-emerald-500/30"
        )}>
          {alert.type === 'pii' ? <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" /> :
           alert.type === 'blocked' ? <XCircle className="w-3 h-3 text-rose-400 mt-0.5 shrink-0" /> :
           <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />}
          <div>
            <span className="font-bold text-[#888]">[{alert.nodeLabel}]</span>{' '}
            <span className={
              alert.type === 'pii' ? 'text-amber-300' :
              alert.type === 'blocked' ? 'text-rose-300' : 'text-emerald-300'
            }>{alert.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
