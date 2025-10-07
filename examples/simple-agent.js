// Simple Agent Example
// Demonstrates basic agent creation and execution

const { PocketFlowCompiler } = require('../compiler.js');

// Simple greeting agent configuration
const greetingAgent = {
    version: "pf-js/1.0",
    entry: "greet",
    globals: { 
        model: "gpt-4o-mini",
        temperature: 0.7
    },
    nodes: [
        {
            id: "greet",
            kind: "llm",
            exec: { 
                prompt: "Create a friendly greeting for {{ctx.name}}. Keep it under 20 words.",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "greeting", value: "{{result.text}}" }
                    ] 
                }
            }
        }
    ],
    edges: []
};

// Mock LLM for demonstration
const mockLLM = {
    async call({ prompt, model }) {
        console.log(`[${model}] Processing: ${prompt.substring(0, 50)}...`);
        
        // Simulate different responses based on content
        if (prompt.includes("greeting")) {
            return { 
                text: `Hello ${prompt.match(/{{ctx\.name}}/g) ? 'there' : 'friend'}! How are you doing today?`,
                meta: { model, timestamp: new Date().toISOString() }
            };
        }
        
        return { 
            text: "This is a mock response.",
            meta: { model, timestamp: new Date().toISOString() }
        };
    }
};

async function runSimpleAgent() {
    try {
        console.log("🤖 Running Simple Greeting Agent...\n");
        
        // Create compiler with mock LLM
        const compiler = new PocketFlowCompiler({ llm: mockLLM });
        
        // Compile the agent configuration
        const { flow } = compiler.compile(greetingAgent);
        
        // Test with different names
        const testCases = [
            { name: "Alice" },
            { name: "Bob" },
            { name: "World" }
        ];
        
        for (const testCase of testCases) {
            console.log(`Testing with name: ${testCase.name}`);
            const shared = { ...testCase, _lastResult: null };
            
            await flow.run(shared);
            
            console.log(`Result: ${shared.greeting}\n`);
        }
        
        console.log("✅ Simple agent test completed successfully!");
        
    } catch (error) {
        console.error("❌ Simple agent test failed:", error.message);
        console.error(error.stack);
    }
}

// Export for use in other files
module.exports = {
    greetingAgent,
    mockLLM,
    runSimpleAgent
};

// Run if this file is executed directly
if (require.main === module) {
    runSimpleAgent();
}
