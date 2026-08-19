import { Node, Edge } from '@xyflow/react';

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error';
export type ExecutionMode = 'simulate' | 'live';

export type NodeType = 
  | 'triggerNode'
  | 'llmNode'
  | 'memoryNode'
  | 'routerNode'
  | 'toolNode'
  | 'workerNode'
  | 'sagaNode';

export interface BaseNodeData {
  label: string;
  status?: ExecutionStatus;
  config?: Record<string, any>;
  onConfigClick?: () => void;
  onDeleteClick?: () => void;
  onDuplicateClick?: () => void;
}

export interface AppNode extends Node {
  type: NodeType;
  data: BaseNodeData;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  nodeId: string;
  nodeLabel: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  payload?: any;
}

export interface ProfilerData {
  nodeId: string;
  nodeLabel: string;
  latencyMs: number;
  tokensUsed?: number;
  bigO?: string;
}

export interface SecurityAlert {
  id: string;
  timestamp: number;
  nodeId: string;
  nodeLabel: string;
  type: 'blocked' | 'pii' | 'ok';
  message: string;
}
