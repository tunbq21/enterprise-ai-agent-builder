# Enterprise AI Agent Visual Builder Lab

Welcome to the Enterprise AI Agent Visual Builder Lab! This application provides a powerful drag-and-drop interface for designing, configuring, and executing complex, distributed AI agent workflows.

## Features

- **Visual Node Editor**: Build workflows using specialized nodes (Triggers, LLM Reasoners, Vector Memory, Logic Routers, Action Tools, Multi-modal Workers, and Saga Checkpoints).
- **Interactive Configuration**: Customize each node's behavior (e.g., swapping LLM models, choosing memory compaction strategies, or defining routing conditions).
- **Live Execution Engine**: Watch your data flow through the graph in real-time with visual status indicators (idle, running, success, error).
- **X-Ray Inspector (Bottom Panel)**:
  - **Console**: View real-time JSON payloads and execution logs.
  - **Profiler**: Track latency, token expenditure, and algorithmic complexity metrics (Big-O).
  - **Security**: Monitor AST guardrails and PII masking alerts.

## 📖 Detailed User Guide

For a comprehensive breakdown of every UI component, node configurations, and step-by-step practical examples (like building a Customer Support Agent), please refer to our **[Detailed User Guide](USER_GUIDE.md)**!

## How to Use the Application

### 1. Building a Workflow
1. **Open the Palette**: Look at the **Node Palette** on the left sidebar.
2. **Drag and Drop**: Click and drag any node from the palette onto the main grid canvas.
3. **Connect Nodes**: Click and drag from a node's output handle (right side, green) to another node's input handle (left side, blue) to establish a data flow edge.
   - *Note*: Every workflow should ideally start with a **Trigger / Input** node.

### 2. Configuring Nodes
1. **Open Settings**: Click the small **Gear (⚙️)** icon on the top right of any node on the canvas.
2. **Adjust Parameters**: The **Config Panel** will slide in from the right. Here you can adjust specific parameters:
   - *LLM Reasoner*: Change the AI model, reasoning strategy, system prompt, and temperature.
   - *Memory Node*: Set the database type, spreading activation, and context compaction strategy.
   - *Router Node*: Define routing conditions and target paths.
3. **Close Panel**: Click the 'X' to close the configuration panel when done.

### 3. Executing the Graph
1. **Run**: Click the **Run Workflow** button located in the top navigation bar.
2. **Monitor**: Watch the nodes light up as they execute sequentially or in parallel.
3. **Stop**: You can click **Stop** at any time to halt the execution.

### 4. Analyzing Diagnostics
1. **Open Inspector**: Click the tabs at the bottom of the screen (Console, Profiler, Security) to expand the X-Ray Inspector.
2. **Review Logs**: Check the **Console / Logs** tab to see detailed execution steps, success messages, and any simulated errors or rollbacks.
3. **Check Metrics**: Use the **Profiler** tab to see how long each node took and estimate resource consumption.

## Node Types Overview

- **Trigger / Input**: The starting point of the workflow.
- **LLM Reasoner**: The core intelligence block (e.g., Gemini Pro).
- **Memory / State**: Stores context and handles RAG capabilities.
- **Logic Router**: Directs flow based on specific conditions.
- **Tool / Action**: Executes code, SQL, or API calls.
- **Worker Node**: Specialized tasks like CNN/RNN processing.
- **Saga Checkpoint**: Manages transaction boundaries and triggers rollbacks on downstream failures.
