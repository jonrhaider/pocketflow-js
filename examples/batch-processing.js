// Batch Processing Example
// Demonstrates processing multiple items in parallel

const { PocketFlowCompiler } = require('../compiler.js');

// Batch processing agent for document summarization
const batchProcessingAgent = {
    version: "pf-js/1.0",
    entry: "summarize_documents",
    globals: { 
        model: "gpt-4o-mini",
        temperature: 0.3
    },
    nodes: [
        {
            id: "summarize_documents",
            kind: "batch",
            prep: { 
                inputs: [{ path: "documents", required: true }] 
            },
            exec: { 
                prompt: "Summarize this document in 2-3 sentences:\n{{item.content}}",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "summaries", value: "{{result}}" }
                    ] 
                },
                next: "combine_summaries"
            }
        },
        {
            id: "combine_summaries",
            kind: "llm",
            exec: { 
                prompt: "Combine these document summaries into one comprehensive overview:\n{{ctx.summaries}}",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "final_summary", value: "{{result.text}}" }
                    ] 
                }
            }
        }
    ],
    edges: [
        { from: "summarize_documents", to: "combine_summaries" }
    ]
};

// Mock LLM for demonstration
const mockLLM = {
    async call({ prompt, model }) {
        console.log(`[${model}] Processing batch item...`);
        
        // Simulate summarization
        if (prompt.includes("Summarize this document")) {
            return { 
                text: "This document discusses important concepts and provides valuable insights on the topic.",
                meta: { model, timestamp: new Date().toISOString() }
            };
        }
        
        if (prompt.includes("Combine these document summaries")) {
            return { 
                text: "Comprehensive overview: All documents provide valuable insights into the subject matter, covering key concepts and important details that contribute to a complete understanding of the topic.",
                meta: { model, timestamp: new Date().toISOString() }
            };
        }
        
        return { 
            text: "Mock response for batch processing.",
            meta: { model, timestamp: new Date().toISOString() }
        };
    }
};

async function runBatchProcessing() {
    try {
        console.log("📚 Running Batch Processing Example...\n");
        
        // Create compiler with mock LLM
        const compiler = new PocketFlowCompiler({ llm: mockLLM });
        
        // Compile the batch processing configuration
        const { flow } = compiler.compile(batchProcessingAgent);
        
        // Test with sample documents
        const sampleDocuments = [
            { id: "doc1", title: "AI Fundamentals", content: "Artificial Intelligence is a rapidly evolving field..." },
            { id: "doc2", title: "Machine Learning", content: "Machine Learning algorithms can learn from data..." },
            { id: "doc3", title: "Deep Learning", content: "Deep Learning uses neural networks with multiple layers..." },
            { id: "doc4", title: "Natural Language Processing", content: "NLP focuses on enabling computers to understand human language..." }
        ];
        
        console.log(`Processing ${sampleDocuments.length} documents...`);
        
        const shared = {
            documents: sampleDocuments,
            _lastResult: null
        };
        
        await flow.run(shared);
        
        console.log("\n📊 Results:");
        console.log(`Individual summaries: ${shared.summaries?.length || 0} items processed`);
        console.log(`Final summary: ${shared.final_summary}`);
        
        console.log("\n✅ Batch processing completed successfully!");
        
    } catch (error) {
        console.error("❌ Batch processing failed:", error.message);
        console.error(error.stack);
    }
}

// Export for use in other files
module.exports = {
    batchProcessingAgent,
    mockLLM,
    runBatchProcessing
};

// Run if this file is executed directly
if (require.main === module) {
    runBatchProcessing();
}
