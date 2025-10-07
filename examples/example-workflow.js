// Example: Complete AI Agent Workflow using PocketFlow Compiler
// This demonstrates how to create a sophisticated AI agent from JSON configuration

const { PocketFlowCompiler } = require('./compiler.js');

// Example: Content Creation Agent
const contentCreationAgent = {
    version: "pf-js/1.0",
    entry: "research",
    globals: { 
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 1000
    },
    nodes: [
        {
            id: "research",
            kind: "llm",
            exec: { 
                prompt: "Research and summarize key points about {{ctx.topic}}. Provide 3-5 bullet points.",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "research_notes", value: "{{result.text}}" }
                    ] 
                },
                next: "outline"
            }
        },
        {
            id: "outline",
            kind: "llm",
            exec: { 
                prompt: "Create a detailed outline for an article about {{ctx.topic}} based on these research notes:\n{{ctx.research_notes}}",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "outline", value: "{{result.text}}" }
                    ] 
                },
                next: "write"
            }
        },
        {
            id: "write",
            kind: "llm",
            exec: { 
                prompt: "Write a comprehensive article based on this outline:\n{{ctx.outline}}\n\nTopic: {{ctx.topic}}",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "draft", value: "{{result.text}}" }
                    ] 
                },
                next: "review"
            }
        },
        {
            id: "review",
            kind: "llm",
            exec: { 
                prompt: "Review this article draft and provide a quality score (0-10) and specific feedback:\n\n{{ctx.draft}}",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "review", value: "{{result.text}}" },
                        { path: "quality_score", value: "{{json(result.meta.score)}}" }
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
                    { label: "revise", when: "ctx.quality_score < 8" },
                    { label: "publish", when: "ctx.quality_score >= 8" }
                ]
            }
        },
        {
            id: "revise",
            kind: "llm",
            exec: { 
                prompt: "Revise this article based on the feedback:\n\nArticle: {{ctx.draft}}\n\nFeedback: {{ctx.review}}",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "draft", value: "{{result.text}}" }
                    ] 
                },
                next: "review"
            },
            loop_guard: { max_iterations: 3 }
        },
        {
            id: "publish",
            kind: "http",
            exec: { 
                url: "https://api.example.com/articles",
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: { 
                    title: "{{ctx.topic}}",
                    content: "{{ctx.draft}}",
                    author: "{{ctx.author || 'AI Assistant'}}"
                }
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "publish_result", value: "{{result.data}}" }
                    ] 
                }
            }
        }
    ],
    edges: [
        { from: "research", to: "outline" },
        { from: "outline", to: "write" },
        { from: "write", to: "review" },
        { from: "review", to: "route" },
        { from: "route", to: "revise", label: "revise" },
        { from: "route", to: "publish", label: "publish" },
        { from: "revise", to: "review" }
    ]
};

// Example: Multi-Agent Collaboration
const multiAgentWorkflow = {
    version: "pf-js/1.0",
    entry: "coordinator",
    globals: { 
        model: "gpt-4o-mini"
    },
    nodes: [
        {
            id: "coordinator",
            kind: "llm",
            exec: { 
                prompt: "Analyze this task and break it down into subtasks: {{ctx.task}}",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "subtasks", value: "{{result.text}}" }
                    ] 
                },
                next: "assign"
            }
        },
        {
            id: "assign",
            kind: "router",
            exec: {
                cases: [
                    { label: "research", when: "ctx.subtasks.includes('research')" },
                    { label: "analysis", when: "ctx.subtasks.includes('analysis')" },
                    { label: "synthesis", when: "true" }
                ]
            }
        },
        {
            id: "research",
            kind: "llm",
            exec: { 
                prompt: "Conduct research for: {{ctx.task}}",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "research_data", value: "{{result.text}}" }
                    ] 
                },
                next: "synthesis"
            }
        },
        {
            id: "analysis",
            kind: "llm",
            exec: { 
                prompt: "Analyze the data: {{ctx.research_data || ctx.task}}",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "analysis", value: "{{result.text}}" }
                    ] 
                },
                next: "synthesis"
            }
        },
        {
            id: "synthesis",
            kind: "llm",
            exec: { 
                prompt: "Synthesize the final result from: {{ctx.research_data}} {{ctx.analysis}}",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "final_result", value: "{{result.text}}" }
                    ] 
                }
            }
        }
    ],
    edges: [
        { from: "coordinator", to: "assign" },
        { from: "assign", to: "research", label: "research" },
        { from: "assign", to: "analysis", label: "analysis" },
        { from: "assign", to: "synthesis", label: "synthesis" },
        { from: "research", to: "synthesis" },
        { from: "analysis", to: "synthesis" }
    ]
};

// Mock LLM implementation
const mockLLM = {
    async call({ prompt, model }) {
        console.log(`[${model}] ${prompt.substring(0, 100)}...`);
        
        // Simulate different responses based on content
        let response = "This is a mock response.";
        
        if (prompt.includes("research")) {
            response = "Research findings: Key insights discovered through comprehensive analysis.";
        } else if (prompt.includes("outline")) {
            response = "I. Introduction\nII. Main Points\nIII. Conclusion";
        } else if (prompt.includes("write")) {
            response = "This is a comprehensive article covering all the key points...";
        } else if (prompt.includes("review")) {
            response = "Quality score: 8.5/10. Well-structured and informative.";
        } else if (prompt.includes("revise")) {
            response = "Revised article with improvements based on feedback...";
        } else if (prompt.includes("analyze")) {
            response = "Analysis shows significant patterns and trends...";
        } else if (prompt.includes("synthesize")) {
            response = "Final synthesis combining all research and analysis...";
        }
        
        return { 
            text: response,
            meta: { 
                model, 
                score: Math.random() * 10,
                timestamp: new Date().toISOString() 
            }
        };
    }
};

// Mock HTTP client
const mockHTTP = {
    async fetch(url, options) {
        console.log(`[HTTP] ${options.method} ${url}`);
        return {
            status: 200,
            json: async () => ({ id: "article_123", url: "https://example.com/articles/123" })
        };
    }
};

async function runExample() {
    try {
        console.log("🤖 Running Content Creation Agent Example...\n");
        
        const compiler = new PocketFlowCompiler({ 
            llm: mockLLM,
            http: mockHTTP
        });
        
        const { flow } = compiler.compile(contentCreationAgent);
        
        const shared = {
            topic: "Artificial Intelligence in Healthcare",
            author: "AI Assistant",
            _lastResult: null
        };
        
        console.log("Initial state:", JSON.stringify(shared, null, 2));
        
        const result = await flow.run(shared);
        
        console.log("\nFinal state:", JSON.stringify(shared, null, 2));
        console.log("Flow completed with result:", result);
        
    } catch (error) {
        console.error("Example failed:", error);
    }
}

// Export for use in other files
module.exports = {
    contentCreationAgent,
    multiAgentWorkflow,
    mockLLM,
    runExample
};

// Run example if this file is executed directly
if (require.main === module) {
    runExample();
}
