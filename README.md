# PocketFlow JavaScript

A minimalist LLM framework for building AI agents and workflows with JSON configuration.

## 🚀 Quick Start

> **📋 Setup Guide**: See [SETUP.md](./SETUP.md) for detailed installation and integration instructions.

### Traditional Approach (JSON DSL)

**CommonJS (require):**
```javascript
const { PocketFlowCompiler } = require('pocketflow-js/compiler');
const { Node, Flow } = require('pocketflow-js');
```

**ES Modules (import):**
```javascript
import { PocketFlowCompiler } from 'pocketflow-js/compiler';
import { Node, Flow } from 'pocketflow-js';
```

// Define your agent in JSON
const agentConfig = {
    version: "pf-js/1.0",
    entry: "greet",
    nodes: [
        {
            id: "greet",
            kind: "llm",
            exec: { prompt: "Hello {{ctx.name}}!" },
            post: { outputs: { save: [{ path: "greeting", value: "{{result.text}}" }] } }
        }
    ],
    edges: []
};

// Compile and run
const compiler = new PocketFlowCompiler({ llm: yourLLM });
const { flow } = compiler.compile(agentConfig);
await flow.run({ name: "World" });
```

### Meta Agent Creator (AI creates agents from descriptions)

**CommonJS (require):**
```javascript
const { MetaAgentCreator } = require('pocketflow-js/compiler');
```

**ES Modules (import):**
```javascript
import { MetaAgentCreator } from 'pocketflow-js/compiler';
```

// Create meta agent creator
const metaCreator = new MetaAgentCreator(yourLLM);

// Create agent from natural language description
const result = await metaCreator.createAndRunAgent(
    "Create a content sentiment analyzer that returns positive, negative, or neutral",
    { content: "I love this product!" }
);

console.log('Agent result:', result.shared.result);
```

## 📁 Package Contents

- **`index.js`** - Core PocketFlow framework (Node, Flow, AsyncNode, etc.)
- **`compiler.js`** - JSON DSL to executable PocketFlow compiler
- **`schema.json`** - JSON schema for validating configurations
- **`examples/`** - Sample workflows and test files
- **`.cursorrules`** - AI agent guidelines for PocketFlow development

## 🏗️ Architecture

PocketFlow uses a **Graph + Shared Store** model:

- **Nodes** handle individual tasks (LLM calls, HTTP requests, data processing)
- **Edges** connect nodes with labeled actions for routing
- **Shared Store** enables communication between nodes
- **Flows** orchestrate node execution

## 📝 JSON DSL

Define your AI agents using a simple JSON configuration:

```json
{
    "version": "pf-js/1.0",
    "entry": "start_node",
    "globals": { "model": "gpt-4o-mini" },
    "nodes": [
        {
            "id": "start_node",
            "kind": "llm",
            "exec": { "prompt": "Process: {{ctx.input}}" },
            "post": { 
                "outputs": { 
                    "save": [{ "path": "result", "value": "{{result.text}}" }] 
                } 
            }
        }
    ],
    "edges": []
}
```

## 🔧 Node Types

### LLM Nodes
```json
{
    "id": "llm_node",
    "kind": "llm",
    "exec": {
        "prompt": "Your prompt here {{ctx.variable}}",
        "model": "gpt-4o-mini"
    },
    "retry": { "max": 3, "wait": 1 },
    "timeout": 30000
}
```

### HTTP Nodes
```json
{
    "id": "http_node",
    "kind": "http",
    "exec": {
        "url": "https://api.example.com/endpoint",
        "method": "POST",
        "headers": { "Content-Type": "application/json" },
        "body": { "data": "{{ctx.input}}" }
    }
}
```

### Router Nodes
```json
{
    "id": "router_node",
    "kind": "router",
    "exec": {
        "cases": [
            { "label": "positive", "when": "ctx.score > 0.8" },
            { "label": "negative", "when": "ctx.score < 0.3" },
            { "label": "neutral", "when": "true" }
        ]
    }
}
```

### Data Nodes
```json
{
    "id": "data_node",
    "kind": "data",
    "exec": { "message": "Static data or processed result" },
    "post": { 
        "outputs": { 
            "save": [{ "path": "output", "value": "{{exec.message}}" }] 
        } 
    }
}
```

### Batch Nodes
```json
{
    "id": "batch_node",
    "kind": "batch",
    "prep": { "inputs": [{ "path": "items", "required": true }] }
}
```

### Async Nodes
```json
{
    "id": "async_node",
    "kind": "async",
    "exec": { "prompt": "Async processing: {{ctx.input}}" }
}
```

### Parallel Nodes
```json
{
    "id": "parallel_node",
    "kind": "parallel",
    "prep": { "inputs": [{ "path": "items" }] }
}
```

## 🔗 Edge Configuration

Connect nodes with labeled edges:

```json
{
    "edges": [
        { "from": "node_a", "to": "node_b" },
        { "from": "router", "to": "positive", "label": "positive" },
        { "from": "router", "to": "negative", "label": "negative" },
        { "from": "check", "to": "retry", "when": "ctx.retry_count < 3" }
    ]
}
```

## 🎯 Template Interpolation

Use `{{variable}}` syntax for dynamic content:

- `{{ctx.variable}}` - Access shared state
- `{{result.property}}` - Access node execution results
- `{{json(expression)}}` - JSON stringify expressions

## 🔄 Retry & Error Handling

Configure retry logic and timeouts:

```json
{
    "retry": {
        "max": 3,
        "wait": 2,
        "backoff": "exponential"
    },
    "timeout": 30000,
    "loop_guard": { "max_iterations": 5 }
}
```

## 🚀 Environment Setup

Configure your environment with LLM and HTTP clients:

```javascript
const env = {
    llm: {
        async call({ prompt, model }) {
            // Your LLM implementation
            return { text: "AI response", meta: { score: 0.9 } };
        }
    },
    http: {
        async fetch(url, options) {
            // Your HTTP client
            return { status: 200, data: {} };
        }
    }
};

const compiler = new PocketFlowCompiler(env);
```

## 📚 Examples

Check the `examples/` folder for:

- **`test-compiler.js`** - Basic compiler test
- **`example-workflow.js`** - Content creation agent
- **`multi-agent.js`** - Multi-agent collaboration
- **`batch-processing.js`** - Batch workflow example

## 🧪 Testing

Run the test suite:

```bash
node examples/test-compiler.js
```

## 🔧 Development

### Adding Custom Node Types

Extend the compiler registry:

```javascript
const compiler = new PocketFlowCompiler(env);

compiler.registry.custom = (nodeConfig) => {
    const node = new Node();
    // Your custom node implementation
    return node;
};
```

### Validation

Use the JSON schema for validation:

```javascript
const Ajv = require('ajv');
const schema = require('./schema.json');

const ajv = new Ajv();
const validate = ajv.compile(schema);
const valid = validate(yourConfig);
```

## 📖 Design Patterns

PocketFlow supports common AI patterns:

- **Workflow** - Sequential task chains
- **Agent** - Autonomous decision-making with routing
- **RAG** - Retrieval-Augmented Generation
- **Map-Reduce** - Parallel processing with aggregation
- **Multi-Agent** - Coordinated agent collaboration

## 🤝 Contributing

1. Follow the patterns in `examples/`
2. Add tests for new features
3. Update `schema.json` for new node types
4. Document new patterns in README

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [PocketFlow Python](https://github.com/the-pocket/PocketFlow) - Original Python implementation
- [Documentation](https://the-pocket.github.io/PocketFlow/) - Full framework docs
- [Examples](examples/) - Sample workflows and patterns
