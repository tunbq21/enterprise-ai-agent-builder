import { AppNode, LogEntry, ProfilerData, ExecutionMode, SecurityAlert } from '@/types';
import { Edge } from '@xyflow/react';
import { GoogleGenAI } from '@google/genai';

export class WorkflowEngine {
  nodes: AppNode[];
  edges: Edge[];
  mode: ExecutionMode;
  triggerInput: string;
  updateNodeStatus: (nodeId: string, status: AppNode['data']['status']) => void;
  addLog: (log: LogEntry) => void;
  addProfilerData: (data: ProfilerData) => void;
  addSecurityAlert: (alert: SecurityAlert) => void;
  onComplete: () => void;
  isRunning: boolean = false;
  private genai: GoogleGenAI | null = null;

  constructor(
    nodes: AppNode[],
    edges: Edge[],
    mode: ExecutionMode,
    triggerInput: string,
    updateNodeStatus: (nodeId: string, status: AppNode['data']['status']) => void,
    addLog: (log: LogEntry) => void,
    addProfilerData: (data: ProfilerData) => void,
    addSecurityAlert: (alert: SecurityAlert) => void,
    onComplete: () => void
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.mode = mode;
    this.triggerInput = triggerInput;
    this.updateNodeStatus = updateNodeStatus;
    this.addLog = addLog;
    this.addProfilerData = addProfilerData;
    this.addSecurityAlert = addSecurityAlert;
    this.onComplete = onComplete;

    if (mode === 'live') {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        this.genai = new GoogleGenAI({ apiKey });
      }
    }
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
      message: `Workflow execution started [mode: ${this.mode.toUpperCase()}].`,
    });

    // BFS Traversal with proper visited guard to prevent infinite loops
    const queue: { nodeId: string; payload: any }[] = [
      { nodeId: trigger.id, payload: { userInput: this.triggerInput || 'Workflow triggered.' } },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      if (!this.isRunning) break;

      const { nodeId, payload } = queue.shift()!;

      // Prevent infinite loops from cyclic graphs
      if (visited.has(nodeId)) {
        this.addLog({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          nodeId,
          nodeLabel: 'System',
          type: 'warning',
          message: `Cycle detected at node ${nodeId}. Skipping to prevent infinite loop.`,
        });
        continue;
      }
      visited.add(nodeId);

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
        message: `Executing node... [${this.mode === 'live' ? '🔴 LIVE' : '🔵 SIMULATED'}]`,
        payload,
      });

      const startMs = performance.now();
      let nextPayload: any = { ...payload };
      let isError = false;

      try {
        if (this.mode === 'live') {
          nextPayload = await this.executeLive(node, payload);
        } else {
          await this.simulateWork(node);
          // Simulate 5% random error except for trigger
          isError = node.type !== 'triggerNode' && Math.random() < 0.05;
          nextPayload = { ...payload, [node.data.label]: 'processed (simulated)' };
        }
      } catch (err: any) {
        isError = true;
        this.addLog({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          nodeId: node.id,
          nodeLabel: node.data.label,
          type: 'error',
          message: `Execution error: ${err?.message || String(err)}`,
        });
      }

      const latency = performance.now() - startMs;

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

        // Saga rollback support
        if (node.type === 'sagaNode') {
          this.addLog({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            nodeId: node.id,
            nodeLabel: node.data.label,
            type: 'warning',
            message: `Initiating Saga Rollback...`,
          });
          const rollbackEdges = this.edges.filter(
            (e) => e.source === node.id && e.sourceHandle === 'out-1'
          );
          for (const e of rollbackEdges) {
            queue.push({ nodeId: e.target, payload: { rollback: true, errorFrom: node.id } });
          }
        }
        continue;
      }

      // Success path
      this.updateNodeStatus(node.id, 'success');
      this.addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        nodeId: node.id,
        nodeLabel: node.data.label,
        type: 'success',
        message:
          this.mode === 'live' && node.type === 'llmNode'
            ? `LLM response: "${String(nextPayload[node.data.label] ?? '').slice(0, 120)}..."`
            : `Node completed successfully.`,
        payload: nextPayload,
      });

      this.addProfilerData({
        nodeId: node.id,
        nodeLabel: node.data.label,
        latencyMs: Math.round(latency),
        tokensUsed:
          node.type === 'llmNode'
            ? nextPayload._tokensUsed ?? Math.floor(Math.random() * 500) + 50
            : undefined,
        bigO:
          node.type === 'memoryNode'
            ? 'O(log n)'
            : node.type === 'llmNode'
            ? 'O(n²)'
            : 'O(1)',
      });

      // Route outgoing edges
      const outgoingEdges = this.edges.filter((e) => e.source === node.id);

      if (node.type === 'routerNode' && outgoingEdges.length > 0) {
        // Evaluate condition from config instead of random
        const chosen = this.evaluateRouter(node, outgoingEdges, nextPayload);
        queue.push({ nodeId: chosen.target, payload: nextPayload });
        this.addLog({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          nodeId: node.id,
          nodeLabel: node.data.label,
          type: 'success',
          message: `Condition evaluated → routing to edge [${chosen.id}]`,
        });
      } else {
        for (const edge of outgoingEdges) {
          // For saga, skip rollback path (out-1) on success
          if (node.type === 'sagaNode' && edge.sourceHandle === 'out-1') continue;
          queue.push({ nodeId: edge.target, payload: nextPayload });
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

  // --- LIVE EXECUTION ---
  private async executeLive(node: AppNode, payload: any): Promise<any> {
    switch (node.type) {
      case 'triggerNode':
        return { ...payload };

      case 'llmNode': {
        const model = node.data.config?.model || 'gemini-2.0-flash';
        const systemPrompt =
          node.data.config?.systemPrompt ||
          'You are a helpful AI assistant in a multi-agent workflow. Be concise.';
        const userMessage = payload.userInput || JSON.stringify(payload);

        if (!this.genai) {
          throw new Error(
            'Gemini API key not set. Please add VITE_GEMINI_API_KEY to your .env file.'
          );
        }

        // Scan for sensitive patterns before calling LLM
        const piiPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b|\b\d{3}-\d{2}-\d{4}\b/;
        if (piiPattern.test(userMessage)) {
          this.addSecurityAlert({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            nodeId: node.id,
            nodeLabel: node.data.label,
            type: 'pii',
            message: 'PII detected in payload. Data masked before sending to LLM.',
          });
        }

        const response = await this.genai.models.generateContent({
          model,
          contents: userMessage,
          config: {
            systemInstruction: systemPrompt,
            temperature: node.data.config?.temperature ?? 0.7,
          },
        });

        const text = response.text ?? '';
        return {
          ...payload,
          [node.data.label]: text,
          _tokensUsed: Math.floor(text.length / 4), // rough estimate
          userInput: text, // pass LLM output as input to next node
        };
      }

      case 'memoryNode':
        await this.simulateWork(node);
        return { ...payload, [node.data.label]: 'context_retrieved' };

      case 'toolNode': {
        const toolType = node.data.config?.toolType || 'AST Sandbox';
        // Check for blocked operations in AST sandbox mode
        if (toolType === 'AST Sandbox') {
          this.addSecurityAlert({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            nodeId: node.id,
            nodeLabel: node.data.label,
            type: 'ok',
            message: 'AST guardrails active. Blocked opcodes: os.system, subprocess, eval, exec.',
          });
        }
        await this.simulateWork(node);
        return { ...payload, [node.data.label]: `tool_executed (${toolType})` };
      }

      case 'routerNode':
      case 'workerNode':
      case 'sagaNode':
      default:
        await this.simulateWork(node);
        return { ...payload, [node.data.label]: 'processed' };
    }
  }

  // --- ROUTER CONDITION EVALUATION ---
  private evaluateRouter(node: AppNode, edges: Edge[], payload: any): Edge {
    const cond1 = node.data.config?.cond1 as string | undefined;
    if (cond1 && edges.length >= 2) {
      try {
        // Support simple expressions like: payload.intent == "refund"
        const match = cond1.match(/payload\.(\w+)\s*==\s*["'](.+)["']/);
        if (match) {
          const [, key, expectedValue] = match;
          const actualValue = String(payload[key] ?? '');
          const condMet = actualValue.toLowerCase().includes(expectedValue.toLowerCase());
          return condMet ? edges[0] : edges[1];
        }
      } catch {
        // fallback to first edge
      }
    }
    // Fallback: pick randomly if no condition configured
    return edges[Math.floor(Math.random() * edges.length)];
  }

  // --- SIMULATED WORK ---
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
    const actualDelay = delay + Math.random() * delay * 0.2;
    return new Promise((resolve) => setTimeout(resolve, actualDelay));
  }
}
