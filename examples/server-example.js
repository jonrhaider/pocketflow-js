// Example server.js showing how to use the Meta Agent Creator
// This demonstrates the /api/agent/meta-creator endpoint

const express = require('express');
const { MetaAgentCreator } = require('../compiler.js');

// Mock LLM client (replace with your actual LLM implementation)
const mockLLM = {
    async call({ prompt }) {
        console.log(`[LLM] Creating agent from description...`);
        
        // This is a mock response - in reality, you'd call your actual LLM
        const mockResponse = {
            text: `{
                "version": "pf-js/1.0",
                "entry": "analyze",
                "globals": { "model": "gpt-4o-mini" },
                "nodes": [
                    {
                        "id": "analyze",
                        "kind": "llm",
                        "exec": { "prompt": "Analyze this content: {{ctx.content}}" },
                        "post": { 
                            "outputs": { 
                                "save": [{ "path": "analysis", "value": "{{result.text}}" }] 
                            },
                            "next": "route"
                        }
                    },
                    {
                        "id": "route",
                        "kind": "router",
                        "exec": {
                            "cases": [
                                { "label": "positive", "when": "ctx.analysis.includes('positive')" },
                                { "label": "negative", "when": "ctx.analysis.includes('negative')" },
                                { "label": "neutral", "when": "true" }
                            ]
                        }
                    },
                    {
                        "id": "positive",
                        "kind": "data",
                        "exec": { "message": "Content is positive" },
                        "post": { 
                            "outputs": { 
                                "save": [{ "path": "result", "value": "{{exec.message}}" }] 
                            } 
                        }
                    },
                    {
                        "id": "negative",
                        "kind": "data",
                        "exec": { "message": "Content is negative" },
                        "post": { 
                            "outputs": { 
                                "save": [{ "path": "result", "value": "{{exec.message}}" }] 
                            } 
                        }
                    },
                    {
                        "id": "neutral",
                        "kind": "data",
                        "exec": { "message": "Content is neutral" },
                        "post": { 
                            "outputs": { 
                                "save": [{ "path": "result", "value": "{{exec.message}}" }] 
                            } 
                        }
                    }
                ],
                "edges": [
                    { "from": "analyze", "to": "route" },
                    { "from": "route", "to": "positive", "label": "positive" },
                    { "from": "route", "to": "negative", "label": "negative" },
                    { "from": "route", "to": "neutral", "label": "neutral" }
                ]
            }`
        };
        
        return mockResponse;
    }
};

// Initialize the meta agent creator
const metaCreator = new MetaAgentCreator(mockLLM);

// Example Express server
const app = express();
app.use(express.json());

// Meta Agent Creator endpoint
app.post('/api/agent/meta-creator', async (req, res) => {
    try {
        const { description, shared = {}, options = {} } = req.body;
        
        if (!description) {
            return res.status(400).json({ 
                error: 'Description is required' 
            });
        }
        
        console.log(`Creating agent from description: "${description}"`);
        
        // Create and run the agent
        const result = await metaCreator.createAndRunAgent(description, shared, options);
        
        res.json({
            success: true,
            description: description,
            config: result.config,
            executionResult: result.executionResult,
            shared: result.shared
        });
        
    } catch (error) {
        console.error('Meta agent creation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Alternative endpoint that just creates the config without running
app.post('/api/agent/meta-creator/config', async (req, res) => {
    try {
        const { description, options = {} } = req.body;
        
        if (!description) {
            return res.status(400).json({ 
                error: 'Description is required' 
            });
        }
        
        console.log(`Creating agent config from description: "${description}"`);
        
        // Just create the configuration
        const result = await metaCreator.createAgentFromDescription(description, options);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }
        
        res.json({
            success: true,
            description: description,
            config: result.config
        });
        
    } catch (error) {
        console.error('Meta agent config creation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'pocketflow-meta-creator' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 PocketFlow Meta Agent Creator server running on port ${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   POST /api/agent/meta-creator - Create and run agent`);
    console.log(`   POST /api/agent/meta-creator/config - Create agent config only`);
    console.log(`   GET /health - Health check`);
});

// Example usage:
/*
// Test the meta creator
async function testMetaCreator() {
    const description = "Create a content sentiment analyzer that takes text input and returns positive, negative, or neutral sentiment";
    
    const result = await metaCreator.createAndRunAgent(description, {
        content: "I love this product! It's amazing!"
    });
    
    console.log('Agent created and executed:', result);
}

// Uncomment to test
// testMetaCreator();
*/

module.exports = { app, metaCreator };
