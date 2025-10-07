# PocketFlow-JS Package Setup Guide

## 📦 Package Installation

### Option 1: Copy Package Files
```bash
# Copy the entire pocketflow-js/ directory to your project
cp -r pocketflow-js/ ./my-project/
```

### Option 2: NPM Package (Future)
```bash
npm install pocketflow-js
```

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install openai dotenv
```

### 2. Environment Configuration
Create `.env` file:
```env
OPENAI_API_KEY=your_api_key_here
OPENAI_ORG_ID=your_org_id_here
```

### 3. Basic Usage

**CommonJS (require):**
```javascript
// Import the package
const { PocketFlowCompiler, MetaAgentCreator } = require('pocketflow-js/compiler');
const { Node, Flow } = require('pocketflow-js');
```

**ES Modules (import):**
```javascript
// Import the package
import { PocketFlowCompiler, MetaAgentCreator } from 'pocketflow-js/compiler';
import { Node, Flow } from 'pocketflow-js';
```

// Set up LLM client
const { OpenAI } = require('openai');
const llmClient = {
    async call({ prompt }) {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
        });
        return response.choices[0].message.content;
    }
};

// Create meta agent creator
const metaCreator = new MetaAgentCreator(llmClient);

// Create agent from description
const result = await metaCreator.createAndRunAgent(
    "Create a text summarizer",
    { text: "Your text to summarize here" }
);

console.log('Summary:', result.shared.summary);
```

## 📁 Package Structure
```
pocketflow-js/
├── index.js          # Core PocketFlow framework
├── compiler.js       # JSON DSL compiler + MetaAgentCreator
├── schema.json       # JSON schema for validation
├── README.md         # Package documentation
├── .cursorrules      # AI agent guidelines
├── package.json      # Package metadata
├── docs/             # Design pattern documentation
│   ├── agent.md
│   ├── workflow.md
│   └── ...
└── examples/         # Sample workflows
    ├── simple-agent.js
    ├── test-compiler.js
    └── ...
```

## 🔧 Integration Examples

### Server Integration
```javascript
// server.js
const express = require('express');
const { MetaAgentCreator } = require('pocketflow-js/compiler.js');

const app = express();
const metaCreator = new MetaAgentCreator(yourLLM);

app.post('/api/agent/create', async (req, res) => {
    const { description, input } = req.body;
    const result = await metaCreator.createAndRunAgent(description, input);
    res.json({ success: true, result: result.shared });
});
```

### Custom Node Types
```javascript
// Extend the compiler with custom nodes
const compiler = new PocketFlowCompiler({ llm: yourLLM });

compiler.registry.custom = (nodeConfig) => {
    const node = new Node();
    node.exec = async (input) => {
        // Your custom logic
        return { result: "custom processing" };
    };
    return node;
};
```

## 🧪 Testing
```bash
# Run package tests
node pocketflow-js/examples/test-compiler.js

# Test meta agent creator
node test-complete-meta-creator.js
```
