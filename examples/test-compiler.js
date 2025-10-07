// Test script to verify the compiler works with the actual PocketFlow implementation
const { PocketFlowCompiler } = require('./compiler.js');

// Mock LLM environment for testing
const mockLLM = {
    async call({ prompt, model }) {
        console.log(`[LLM] Model: ${model}, Prompt: ${prompt}`);
        return { 
            text: `AI Response to: ${prompt}`,
            meta: { model, timestamp: new Date().toISOString() }
        };
    }
};

// Test configuration
const testConfig = {
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
                prompt: "Create a friendly greeting for {{ctx.name}}. Keep it under 50 words.",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "greeting", value: "{{result.text}}" },
                        { path: "model_used", value: "{{result.meta.model}}" }
                    ] 
                },
                next: "analyze"
            }
        },
        {
            id: "analyze",
            kind: "llm",
            exec: { 
                prompt: "Analyze the sentiment of this greeting: {{ctx.greeting}}. Rate it 1-10 and explain why.",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "analysis", value: "{{result.text}}" }
                    ] 
                },
                next: "route"
            }
        },
        {
            id: "route",
            kind: "router",
            exec: {
                cases: [
                    { label: "positive", when: "ctx.analysis.includes('positive') || ctx.analysis.includes('good')" },
                    { label: "negative", when: "ctx.analysis.includes('negative') || ctx.analysis.includes('bad')" },
                    { label: "neutral", when: "true" }
                ]
            }
        },
        {
            id: "positive",
            kind: "data",
            exec: { message: "Great! The greeting is positive." },
            post: { 
                outputs: { 
                    save: [
                        { path: "result", value: "{{exec.message}}" }
                    ] 
                }
            }
        },
        {
            id: "negative",
            kind: "data",
            exec: { message: "The greeting could be improved." },
            post: { 
                outputs: { 
                    save: [
                        { path: "result", value: "{{exec.message}}" }
                    ] 
                }
            }
        },
        {
            id: "neutral",
            kind: "data",
            exec: { message: "The greeting is neutral." },
            post: { 
                outputs: { 
                    save: [
                        { path: "result", value: "{{exec.message}}" }
                    ] 
                }
            }
        }
    ],
    edges: [
        { from: "greet", to: "analyze" },
        { from: "analyze", to: "route" },
        { from: "route", to: "positive", label: "positive" },
        { from: "route", to: "negative", label: "negative" },
        { from: "route", to: "neutral", label: "neutral" }
    ]
};

async function testCompiler() {
    try {
        console.log("🧪 Testing PocketFlow Compiler...\n");
        
        // Create compiler with mock environment
        const compiler = new PocketFlowCompiler({ llm: mockLLM });
        
        // Compile the configuration
        console.log("📦 Compiling configuration...");
        const { flow, nodes, config } = compiler.compile(testConfig);
        console.log(`✅ Compiled successfully! Created ${nodes.size} nodes.`);
        
        // Test the flow
        console.log("\n🚀 Running flow...");
        const shared = { 
            name: "Alice",
            _lastResult: null
        };
        
        console.log("Initial shared state:", JSON.stringify(shared, null, 2));
        
        const result = await flow.run(shared);
        
        console.log("\n📊 Final shared state:");
        console.log(JSON.stringify(shared, null, 2));
        console.log(`\n🎯 Flow result: ${result}`);
        
        // Verify expected outputs
        const expectedKeys = ['greeting', 'model_used', 'analysis', 'result'];
        const missingKeys = expectedKeys.filter(key => !(key in shared));
        
        if (missingKeys.length === 0) {
            console.log("\n✅ All tests passed! The compiler works correctly with your PocketFlow implementation.");
        } else {
            console.log(`\n⚠️  Missing expected outputs: ${missingKeys.join(', ')}`);
        }
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        console.error(error.stack);
    }
}

// Run the test
if (require.main === module) {
    testCompiler();
}

module.exports = { testCompiler };
