import { AppNode, LogEntry, ProfilerData } from '@/types';
import { Edge } from '@xyflow/react';

export class WorkflowEngine {
  nodes: AppNode[];
  edges: Edge[];
  updateNodeStatus: (nodeId: string, status: AppNode['data']['status']) => void;
  addLog: (log: LogEntry) => void;
  addProfilerData: (data: ProfilerData) => void;
  onComplete: () => void;
  isRunning: boolean = false;

  constructor(
    nodes: AppNode[],
    edges: Edge[],
    updateNodeStatus: (nodeId: string, status: AppNode['data']['status']) => void,
    addLog: (log: LogEntry) => void,
    addProfilerData: (data: ProfilerData) => void,
    onComplete: () => void
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.updateNodeStatus = updateNodeStatus;
    this.addLog = addLog;
    this.addProfilerData = addProfilerData;
    this.onComplete = onComplete;
  }

  async run() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Reset all nodes
    for (const node of this.nodes) {
      this.updateNodeStatus(node.id, 'idle');
    }

    // Find trigger node
    const trigger = this.nodes.find((n) => n.type === 'triggerNode');
    if (!trigger) {
      this.addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        nodeId: 'system',
        nodeLabel: 'System',
        type: 'error',
        message: 'No Trigger Node found in the workflow.',
      });
      this.isRunning = false;
      this.onComplete();
      return;
    }

    this.addLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      nodeId: 'system',
      nodeLabel: 'System',
      type: 'info',
      message: 'Workflow execution started.',
    });

    // Simple BFS Traversal
    const queue: { nodeId: string; payload: any }[] = [{ nodeId: trigger.id, payload: { initial: true } }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      if (!this.isRunning) break; // Check for manual stop

      const { nodeId, payload } = queue.shift()!;
      const node = this.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      // Mark as running
      this.updateNodeStatus(node.id, 'running');
      this.addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        nodeId: node.id,
        nodeLabel: node.data.label,
        type: 'info',
        message: `Executing node...`,
        payload,
      });

      // Simulate work based on node type
      const startMs = performance.now();
      await this.simulateWork(node);
      const latency = performance.now() - startMs;

      // Determine outcome (simulate 5% chance of error for fun, except trigger)
      const isError = node.type !== 'triggerNode' && Math.random() < 0.05;

      if (isError) {
        this.updateNodeStatus(node.id, 'error');
        this.addLog({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          nodeId: node.id,
          nodeLabel: node.data.label,
          type: 'error',
          message: `Execution failed.`,
        });
        
        // Find rollback path if Saga Node
        if (node.type === 'sagaNode') {
           this.addLog({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            nodeId: node.id,
            nodeLabel: node.data.label,
            type: 'warning',
            message: `Initiating Saga Rollback...`,
          });
          // find edge from out-1 (rollback handle usually)
          const rollbackEdges = this.edges.filter(e => e.source === node.id && e.sourceHandle === 'out-1');
          for (const e of rollbackEdges) {
            queue.push({ nodeId: e.target, payload: { rollback: true, errorFrom: node.id } });
          }
        } else {
           // Stop propagation on error for normal nodes
           continue; 
        }

      } else {
        this.updateNodeStatus(node.id, 'success');
        
        // Add Profiler data
        this.addProfilerData({
          nodeId: node.id,
          nodeLabel: node.data.label,
          latencyMs: Math.round(latency),
          tokensUsed: node.type === 'llmNode' ? Math.floor(Math.random() * 500) + 50 : undefined,
          bigO: node.type === 'memoryNode' ? 'O(log n)' : (node.type === 'llmNode' ? 'O(n^2)' : 'O(1)'),
        });

        // Produce output payload
        const nextPayload = { ...payload, [node.data.label]: 'processed' };

        // Find outgoing edges
        const outgoingEdges = this.edges.filter((e) => e.source === node.id);
        
        // For router, maybe only pick one path
        if (node.type === 'routerNode' && outgoingEdges.length > 0) {
           const chosen = outgoingEdges[Math.floor(Math.random() * outgoingEdges.length)];
           queue.push({ nodeId: chosen.target, payload: nextPayload });
           this.addLog({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            nodeId: node.id,
            nodeLabel: node.data.label,
            type: 'success',
            message: `Routed to ${chosen.target}`,
          });
        } else {
           for (const edge of outgoingEdges) {
             // For saga, normal path is out-0
             if (node.type === 'sagaNode' && edge.sourceHandle === 'out-1') continue; 
             queue.push({ nodeId: edge.target, payload: nextPayload });
           }
        }
      }
    }

    this.isRunning = false;
    this.addLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      nodeId: 'system',
      nodeLabel: 'System',
      type: 'info',
      message: 'Workflow execution finished.',
    });
    this.onComplete();
  }

  stop() {
    this.isRunning = false;
  }

  private simulateWork(node: AppNode): Promise<void> {
    const delays: Record<string, number> = {
      triggerNode: 300,
      llmNode: 2000,
      memoryNode: 800,
      routerNode: 400,
      toolNode: 1200,
      workerNode: 1500,
      sagaNode: 500,
    };
    const delay = delays[node.type] || 1000;
    // Add some jitter
    const actualDelay = delay + (Math.random() * delay * 0.2);
    return new Promise((resolve) => setTimeout(resolve, actualDelay));
  }
}
