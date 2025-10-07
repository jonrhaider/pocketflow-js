// Conditional Routing Example
// Demonstrates dynamic routing based on conditions

const { PocketFlowCompiler } = require('../compiler.js');

// Conditional routing agent for content moderation
const moderationAgent = {
    version: "pf-js/1.0",
    entry: "analyze_content",
    globals: { 
        model: "gpt-4o-mini",
        temperature: 0.1
    },
    nodes: [
        {
            id: "analyze_content",
            kind: "llm",
            exec: { 
                prompt: "Analyze this content for appropriateness and provide a score (0-10) and reasoning:\n{{ctx.content}}",
                model: "gpt-4o-mini"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "analysis", value: "{{result.text}}" },
                        { path: "score", value: "{{json(result.meta.score)}}" }
                    ] 
                },
                next: "route_content"
            }
        },
        {
            id: "route_content",
            kind: "router",
            exec: {
                cases: [
                    { 
                        label: "approve", 
                        when: "ctx.score >= 8" 
                    },
                    { 
                        label: "review", 
                        when: "ctx.score >= 5 && ctx.score < 8" 
                    },
                    { 
                        label: "reject", 
                        when: "ctx.score < 5" 
                    }
                ]
            }
        },
        {
            id: "approve",
            kind: "data",
            exec: { 
                message: "Content approved for publication",
                status: "approved"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "decision", value: "{{exec.message}}" },
                        { path: "status", value: "{{exec.status}}" }
                    ] 
                }
            }
        },
        {
            id: "review",
            kind: "data",
            exec: { 
                message: "Content requires manual review",
                status: "pending_review"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "decision", value: "{{exec.message}}" },
                        { path: "status", value: "{{exec.status}}" }
                    ] 
                }
            }
        },
        {
            id: "reject",
            kind: "data",
            exec: { 
                message: "Content rejected - inappropriate content detected",
                status: "rejected"
            },
            post: { 
                outputs: { 
                    save: [
                        { path: "decision", value: "{{exec.message}}" },
                        { path: "status", value: "{{exec.status}}" }
                    ] 
                }
            }
        }
    ],
    edges: [
        { from: "analyze_content", to: "route_content" },
        { from: "route_content", to: "approve", label: "approve" },
        { from: "route_content", to: "review", label: "review" },
        { from: "route_content", to: "reject", label: "reject" }
    ]
};

// Mock LLM for demonstration
const mockLLM = {
    async call({ prompt, model }) {
        console.log(`[${model}] Analyzing content...`);
        
        // Simulate content analysis with different scores
        const content = prompt.match(/{{ctx\.content}}/g) ? 'sample content' : 'test content';
        
        // Simulate different scores based on content keywords
        let score = 7; // Default moderate score
        if (content.includes('inappropriate') || content.includes('offensive')) {
            score = 2;
        } else if (content.includes('excellent') || content.includes('great')) {
            score = 9;
        } else if (content.includes('questionable') || content.includes('borderline')) {
            score = 4;
        }
        
        return { 
            text: `Content analysis: Score ${score}/10. ${score >= 8 ? 'Content is appropriate' : score >= 5 ? 'Content needs review' : 'Content is inappropriate'}.`,
            meta: { 
                model, 
                score,
                timestamp: new Date().toISOString() 
            }
        };
    }
};

async function runConditionalRouting() {
    try {
        console.log("🛡️ Running Content Moderation Agent...\n");
        
        // Create compiler with mock LLM
        const compiler = new PocketFlowCompiler({ llm: mockLLM });
        
        // Compile the moderation configuration
        const { flow } = compiler.compile(moderationAgent);
        
        // Test with different types of content
        const testCases = [
            { 
                content: "This is an excellent article about technology and innovation.",
                expected: "approve"
            },
            { 
                content: "This content is questionable and may need review.",
                expected: "review"
            },
            { 
                content: "This is inappropriate and offensive content.",
                expected: "reject"
            }
        ];
        
        for (const testCase of testCases) {
            console.log(`Testing content: "${testCase.content}"`);
            console.log(`Expected outcome: ${testCase.expected}`);
            
            const shared = {
                content: testCase.content,
                _lastResult: null
            };
            
            await flow.run(shared);
            
            console.log(`Analysis: ${shared.analysis}`);
            console.log(`Score: ${shared.score}`);
            console.log(`Decision: ${shared.decision}`);
            console.log(`Status: ${shared.status}`);
            console.log("---\n");
        }
        
        console.log("✅ Conditional routing test completed successfully!");
        
    } catch (error) {
        console.error("❌ Conditional routing test failed:", error.message);
        console.error(error.stack);
    }
}

// Export for use in other files
module.exports = {
    moderationAgent,
    mockLLM,
    runConditionalRouting
};

// Run if this file is executed directly
if (require.main === module) {
    runConditionalRouting();
}
