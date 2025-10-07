# PocketFlow JavaScript

A minimalist LLM framework for building AI agents and workflows with JSON configuration.

> **🎯 Key Innovation**: This package includes a **Meta Agent Creator** that allows LLMs to automatically generate and execute new agentic workflows from natural language descriptions. This enables dynamic agent creation via API endpoints or direct LLM integration.

## 🙏 Credits

This JavaScript implementation is based on the original [PocketFlow Python framework](https://github.com/The-Pocket/PocketFlow) created by [Zachary Huang](https://github.com/zachary62) and The-Pocket team. The original framework pioneered the concept of "Agentic Coding" - where AI Agents (e.g., Cursor AI) build Agents. With this version, not only can AI agents create (and hardcode) agents into your codebase, but rather, you can now use the DSL method to have a single LLM call return a new agentic JSON object which the "compiler" can execute, on the fly. What does this mean? It means you can allow your backend make an http call to an LLM to create and run a new agentic flow AT RUNTIME! 

**Original Python Framework**: [The-Pocket/PocketFlow](https://github.com/The-Pocket/PocketFlow)  
**Author**: [Zachary Huang](https://github.com/zachary62)  
**Concept**: "100 Lines Let Agents build Agent"

## 🤖 **Meta Agent Creator - The Game Changer**

The **Meta Agent Creator** is what makes this package revolutionary. It allows you to:

- **🎯 Create agents from natural language**: "Create a sentiment analyzer" → Working agent
- **🚀 Dynamic agent generation**: Build agents on-demand via API endpoints  
- **🔄 LLM-to-Agent pipeline**: Any LLM can create new agents automatically
- **⚡ Real-time agent creation**: Generate and execute agents in milliseconds

### **Example: API Endpoint for Dynamic Agent Creation**
```javascript
// server.js - Create agents via HTTP requests
app.post('/api/create-agent', async (req, res) => {
    const { description, input } = req.body;
    
    // Meta Agent Creator generates and runs agent automatically
    const result = await metaCreator.createAndRunAgent(description, input);
    
    res.json({ 
        success: true, 
        agent_result: result.shared,
        generated_config: result.config 
    });
});

// Usage: POST /api/create-agent
// Body: { "description": "Create a text summarizer", "input": { "text": "..." } }
```

## 🚀 Quick Start

> **📋 Setup Guide**: See [SETUP.md](./SETUP.md) for detailed installation and integration instructions.

### **Automatic Cursor AI Setup**
The package automatically copies `.cursorrules` to your project root during installation, giving Cursor AI full context about PocketFlow development patterns.

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

### 🎯 **Meta Agent Creator (AI creates agents from descriptions)**

**The revolutionary feature that enables dynamic agent creation:**

**CommonJS (require):**
```javascript
const { MetaAgentCreator } = require('pocketflow-js/compiler');
```

**ES Modules (import):**
```javascript
import { MetaAgentCreator } from 'pocketflow-js/compiler';
```

**Basic Usage:**
```javascript
// Create meta agent creator
const metaCreator = new MetaAgentCreator(yourLLM);

// Create agent from natural language description
const result = await metaCreator.createAndRunAgent(
    "Create a content sentiment analyzer that returns positive, negative, or neutral",
    { content: "I love this product!" }
);

console.log('Agent result:', result.shared.result);
```

**Advanced: API Endpoint Integration:**
```javascript
// Express.js endpoint for dynamic agent creation
app.post('/api/agent/create', async (req, res) => {
    try {
        const { description, input } = req.body;
        
        // Meta Agent Creator automatically:
        // 1. Generates JSON DSL configuration
        // 2. Compiles it into executable PocketFlow
        // 3. Runs the agent with provided input
        const result = await metaCreator.createAndRunAgent(description, input);
        
        res.json({
            success: true,
            result: result.shared,
            config: result.config, // The generated JSON DSL
            execution_time: result.execution_time
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

**Real-world Examples:**
```javascript
// Create different types of agents dynamically
await metaCreator.createAndRunAgent(
    "Create a text summarizer", 
    { text: "Long article content..." }
);

await metaCreator.createAndRunAgent(
    "Create a code reviewer that checks for security issues",
    { code: "function login() { ... }" }
);

await metaCreator.createAndRunAgent(
    "Create a data analyzer that finds trends in CSV data",
    { csv_data: "name,age,score\nJohn,25,85..." }
);
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

## 🎯 **JSON DSL - The Automation Engine**

The JSON DSL is what enables the Meta Agent Creator to automatically generate working agents. This simple configuration format allows LLMs to create complex workflows:

### **Why JSON DSL is Revolutionary:**
- **🤖 LLM-Friendly**: LLMs can easily generate valid JSON configurations
- **⚡ Instant Compilation**: JSON → Executable PocketFlow in milliseconds  
- **🔄 Dynamic Creation**: Generate new agents on-demand from descriptions
- **🎯 No Coding Required**: Natural language → Working agents

### **How It Works:**
1. **User describes agent**: "Create a sentiment analyzer"
2. **LLM generates JSON DSL**: Automatically creates valid configuration
3. **Compiler converts to executable**: JSON → PocketFlow objects
4. **Agent runs immediately**: Execute with real data

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

## 🚀 **Use Cases & Benefits**

### **🎯 Perfect For:**
- **API Endpoints**: Create agents dynamically via HTTP requests
- **LLM Applications**: Let users describe what they want, get working agents
- **Automation Platforms**: Build agent creation into your workflow tools
- **Rapid Prototyping**: Test agent ideas without writing code
- **Multi-Tenant Apps**: Each user gets custom agents for their needs

### **💡 Real-World Examples:**
```javascript
// Customer support platform
await metaCreator.createAndRunAgent(
    "Create a support agent for our SaaS product",
    { user_question: "How do I reset my password?" }
);

// Content moderation system  
await metaCreator.createAndRunAgent(
    "Create a content moderator that flags inappropriate content",
    { content: "User-generated post content..." }
);

// Business intelligence
await metaCreator.createAndRunAgent(
    "Create a sales data analyzer that finds conversion trends",
    { sales_data: "csv data here..." }
);
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
