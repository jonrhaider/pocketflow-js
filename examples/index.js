// PocketFlow JavaScript Examples
// Comprehensive collection of example workflows and patterns

const { runSimpleAgent } = require('./simple-agent.js');
const { runBatchProcessing } = require('./batch-processing.js');
const { runConditionalRouting } = require('./conditional-routing.js');
const { runExample } = require('./example-workflow.js');
const { testCompiler } = require('./test-compiler.js');

// Example runner that demonstrates all patterns
async function runAllExamples() {
    console.log("🚀 PocketFlow JavaScript Examples\n");
    console.log("=" .repeat(50));
    
    try {
        // 1. Simple Agent
        console.log("\n1️⃣ Simple Agent Example");
        console.log("-".repeat(30));
        await runSimpleAgent();
        
        // 2. Batch Processing
        console.log("\n2️⃣ Batch Processing Example");
        console.log("-".repeat(30));
        await runBatchProcessing();
        
        // 3. Conditional Routing
        console.log("\n3️⃣ Conditional Routing Example");
        console.log("-".repeat(30));
        await runConditionalRouting();
        
        // 4. Complex Workflow
        console.log("\n4️⃣ Complex Workflow Example");
        console.log("-".repeat(30));
        await runExample();
        
        // 5. Compiler Test
        console.log("\n5️⃣ Compiler Test");
        console.log("-".repeat(30));
        await testCompiler();
        
        console.log("\n🎉 All examples completed successfully!");
        console.log("\n📚 Available Examples:");
        console.log("  • simple-agent.js - Basic agent creation");
        console.log("  • batch-processing.js - Parallel document processing");
        console.log("  • conditional-routing.js - Dynamic routing based on conditions");
        console.log("  • example-workflow.js - Complex content creation workflow");
        console.log("  • test-compiler.js - Compiler validation and testing");
        
    } catch (error) {
        console.error("❌ Example execution failed:", error.message);
        console.error(error.stack);
    }
}

// Individual example runners
async function runSimpleExample() {
    console.log("🤖 Running Simple Agent Example...\n");
    await runSimpleAgent();
}

async function runBatchExample() {
    console.log("📚 Running Batch Processing Example...\n");
    await runBatchProcessing();
}

async function runRoutingExample() {
    console.log("🛡️ Running Conditional Routing Example...\n");
    await runConditionalRouting();
}

async function runComplexExample() {
    console.log("🏗️ Running Complex Workflow Example...\n");
    await runExample();
}

async function runTestExample() {
    console.log("🧪 Running Compiler Test...\n");
    await testCompiler();
}

// Export all functions
module.exports = {
    runAllExamples,
    runSimpleExample,
    runBatchExample,
    runRoutingExample,
    runComplexExample,
    runTestExample,
    // Individual example modules
    simpleAgent: require('./simple-agent.js'),
    batchProcessing: require('./batch-processing.js'),
    conditionalRouting: require('./conditional-routing.js'),
    complexWorkflow: require('./example-workflow.js'),
    compilerTest: require('./test-compiler.js')
};

// Run all examples if this file is executed directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        runAllExamples();
    } else {
        const example = args[0];
        switch (example) {
            case 'simple':
                runSimpleExample();
                break;
            case 'batch':
                runBatchExample();
                break;
            case 'routing':
                runRoutingExample();
                break;
            case 'complex':
                runComplexExample();
                break;
            case 'test':
                runTestExample();
                break;
            default:
                console.log("Available examples: simple, batch, routing, complex, test");
                console.log("Usage: node examples/index.js [example_name]");
                console.log("Or run without arguments to run all examples.");
        }
    }
}
