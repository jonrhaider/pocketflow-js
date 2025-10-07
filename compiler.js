// PocketFlow JavaScript Compiler
// Converts JSON DSL to executable PocketFlow nodes and flows

const { Node, BatchNode, AsyncNode, AsyncBatchNode, AsyncParallelBatchNode, Flow, AsyncFlow, AsyncBatchFlow, AsyncParallelBatchFlow } = require('./index.js');

class PocketFlowCompiler {
    constructor(env = {}) {
        this.env = env;
        this.registry = {
            llm: this.createLLMNode.bind(this),
            http: this.createHTTPNode.bind(this),
            router: this.createRouterNode.bind(this),
            data: this.createDataNode.bind(this),
            batch: this.createBatchNode.bind(this),
            async: this.createAsyncNode.bind(this),
            parallel: this.createParallelNode.bind(this)
        };
    }

    // Template engine for mustache-like syntax
    interpolate(template, context) {
        if (typeof template !== 'string') return template;
        
        return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expr) => {
            try {
                // Handle json() function calls
                if (expr.startsWith('json(')) {
                    const inner = expr.slice(5, -1);
                    const result = this.evaluateExpression(inner, context);
                    return JSON.stringify(result);
                }
                
                // Handle regular expressions
                return this.evaluateExpression(expr, context);
            } catch (e) {
                console.warn(`Template interpolation failed for: ${expr}`, e);
                return match;
            }
        });
    }

    evaluateExpression(expr, context) {
        // Simple expression evaluator - in production, use a proper expression parser
        const { ctx, result } = context;
        
        // Create a safe evaluation context
        const evalContext = {
            ctx: ctx || {},
            result: result || {},
            // Add utility functions
            json: (obj) => JSON.stringify(obj),
            stringify: (obj) => JSON.stringify(obj),
            parse: (str) => JSON.parse(str)
        };

        // Simple property access: ctx.topic -> ctx.topic
        if (expr.includes('.')) {
            return this.getNestedProperty(evalContext, expr);
        }

        // Direct variable access
        if (expr in evalContext) {
            return evalContext[expr];
        }

        // Try to evaluate as JavaScript expression (be careful in production!)
        try {
            return new Function('ctx', 'result', `return (${expr})`)(ctx, result);
        } catch (e) {
            return expr; // Return as string if evaluation fails
        }
    }

    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    // Node factory methods
    createLLMNode(nodeConfig) {
        const node = new Node(
            nodeConfig.retry?.max || 1,
            nodeConfig.retry?.wait || 0
        );

        node.prep = (shared) => {
            const context = { ctx: shared, result: shared._lastResult };
            const prompt = this.interpolate(nodeConfig.exec?.prompt || '', context);
            return { prompt, model: nodeConfig.exec?.model || this.env.globals?.model || 'gpt-4o-mini' };
        };

        node.exec = async (prepRes) => {
            if (!this.env.llm) {
                throw new Error('LLM environment not configured. Provide env.llm.call function.');
            }
            
            const result = await this.env.llm.call({
                prompt: prepRes.prompt,
                model: prepRes.model
            });
            
            return result;
        };

        node.post = (shared, prepRes, execRes) => {
            shared._lastResult = execRes;
            
            // Save outputs as configured
            if (nodeConfig.post?.outputs?.save) {
                const context = { ctx: shared, result: execRes };
                for (const save of nodeConfig.post.outputs.save) {
                    const value = this.interpolate(save.value, context);
                    this.setNestedProperty(shared, save.path, value);
                }
            }
            
            return nodeConfig.post?.next || null;
        };

        return node;
    }

    createHTTPNode(nodeConfig) {
        const node = new Node(
            nodeConfig.retry?.max || 1,
            nodeConfig.retry?.wait || 0
        );

        node.prep = (shared) => {
            const context = { ctx: shared, result: shared._lastResult };
            return {
                url: this.interpolate(nodeConfig.exec?.url || '', context),
                method: nodeConfig.exec?.method || 'GET',
                headers: nodeConfig.exec?.headers || {},
                body: nodeConfig.exec?.body || {}
            };
        };

        node.exec = async (prepRes) => {
            const response = await fetch(prepRes.url, {
                method: prepRes.method,
                headers: prepRes.headers,
                body: prepRes.method !== 'GET' ? JSON.stringify(prepRes.body) : undefined
            });
            
            const data = await response.json().catch(() => ({}));
            return {
                status: response.status,
                data: data,
                headers: Object.fromEntries(response.headers.entries())
            };
        };

        node.post = (shared, prepRes, execRes) => {
            shared._lastResult = execRes;
            
            if (nodeConfig.post?.outputs?.save) {
                const context = { ctx: shared, result: execRes };
                for (const save of nodeConfig.post.outputs.save) {
                    const value = this.interpolate(save.value, context);
                    this.setNestedProperty(shared, save.path, value);
                }
            }
            
            return nodeConfig.post?.next || null;
        };

        return node;
    }

    createRouterNode(nodeConfig) {
        const node = new Node();

        node.prep = (shared) => {
            return { shared };
        };

        node.exec = (prepRes) => {
            return prepRes;
        };

        node.post = (shared, prepRes, execRes) => {
            const context = { ctx: shared, result: shared._lastResult };
            
            for (const case_ of nodeConfig.exec?.cases || []) {
                if (!case_.when || this.evaluateCondition(case_.when, context)) {
                    return case_.label;
                }
            }
            
            return null;
        };

        return node;
    }

    createDataNode(nodeConfig) {
        const node = new Node();

        node.prep = (shared) => {
            return { shared };
        };

        node.exec = (prepRes) => {
            return nodeConfig.exec || {};
        };

        node.post = (shared, prepRes, execRes) => {
            if (nodeConfig.post?.outputs?.save) {
                const context = { ctx: shared, result: execRes };
                for (const save of nodeConfig.post.outputs.save) {
                    const value = this.interpolate(save.value, context);
                    this.setNestedProperty(shared, save.path, value);
                }
            }
            
            return nodeConfig.post?.next || null;
        };

        return node;
    }

    createBatchNode(nodeConfig) {
        const node = new BatchNode(
            nodeConfig.retry?.max || 1,
            nodeConfig.retry?.wait || 0
        );

        node.prep = (shared) => {
            return shared[nodeConfig.prep?.inputs?.[0]?.path || 'items'] || [];
        };

        node.exec = async (items) => {
            // BatchNode handles the iteration automatically
            return items;
        };

        node.post = (shared, prepRes, execRes) => {
            shared._lastResult = execRes;
            
            if (nodeConfig.post?.outputs?.save) {
                const context = { ctx: shared, result: execRes };
                for (const save of nodeConfig.post.outputs.save) {
                    const value = this.interpolate(save.value, context);
                    this.setNestedProperty(shared, save.path, value);
                }
            }
            
            return nodeConfig.post?.next || null;
        };

        return node;
    }

    createAsyncNode(nodeConfig) {
        const node = new AsyncNode(
            nodeConfig.retry?.max || 1,
            nodeConfig.retry?.wait || 0
        );

        node.prepAsync = async (shared) => {
            const context = { ctx: shared, result: shared._lastResult };
            const prompt = this.interpolate(nodeConfig.exec?.prompt || '', context);
            return { prompt, model: nodeConfig.exec?.model || this.env.globals?.model || 'gpt-4o-mini' };
        };

        node.execAsync = async (prepRes) => {
            if (!this.env.llm) {
                throw new Error('LLM environment not configured. Provide env.llm.call function.');
            }
            
            const result = await this.env.llm.call({
                prompt: prepRes.prompt,
                model: prepRes.model
            });
            
            return result;
        };

        node.postAsync = async (shared, prepRes, execRes) => {
            shared._lastResult = execRes;
            
            if (nodeConfig.post?.outputs?.save) {
                const context = { ctx: shared, result: execRes };
                for (const save of nodeConfig.post.outputs.save) {
                    const value = this.interpolate(save.value, context);
                    this.setNestedProperty(shared, save.path, value);
                }
            }
            
            return nodeConfig.post?.next || null;
        };

        return node;
    }

    createParallelNode(nodeConfig) {
        const node = new AsyncParallelBatchNode(
            nodeConfig.retry?.max || 1,
            nodeConfig.retry?.wait || 0
        );

        node.prepAsync = async (shared) => {
            return shared[nodeConfig.prep?.inputs?.[0]?.path || 'items'] || [];
        };

        node.execAsync = async (items) => {
            // AsyncParallelBatchNode handles parallel execution automatically
            return items;
        };

        node.postAsync = async (shared, prepRes, execRes) => {
            shared._lastResult = execRes;
            
            if (nodeConfig.post?.outputs?.save) {
                const context = { ctx: shared, result: execRes };
                for (const save of nodeConfig.post.outputs.save) {
                    const value = this.interpolate(save.value, context);
                    this.setNestedProperty(shared, save.path, value);
                }
            }
            
            return nodeConfig.post?.next || null;
        };

        return node;
    }

    evaluateCondition(condition, context) {
        try {
            return new Function('ctx', 'result', `return (${condition})`)(context.ctx, context.result);
        } catch (e) {
            console.warn(`Condition evaluation failed: ${condition}`, e);
            return false;
        }
    }

    // Main compilation method
    compile(config) {
        // Validate required fields
        if (!config.version || !config.entry || !config.nodes || !config.edges) {
            throw new Error('Invalid config: missing required fields (version, entry, nodes, edges)');
        }

        // Create nodes
        const nodes = new Map();
        const nodeIds = new Set();

        for (const nodeConfig of config.nodes) {
            if (nodeIds.has(nodeConfig.id)) {
                throw new Error(`Duplicate node ID: ${nodeConfig.id}`);
            }
            nodeIds.add(nodeConfig.id);

            const factory = this.registry[nodeConfig.kind];
            if (!factory) {
                throw new Error(`Unknown node kind: ${nodeConfig.kind}`);
            }

            const node = factory(nodeConfig);
            nodes.set(nodeConfig.id, node);
        }

        // Connect edges
        for (const edge of config.edges) {
            const fromNode = nodes.get(edge.from);
            const toNode = nodes.get(edge.to);

            if (!fromNode || !toNode) {
                throw new Error(`Edge references missing node: ${edge.from} -> ${edge.to}`);
            }

            const label = edge.label || 'default';
            fromNode.next(toNode, label);
        }

        // Create flow
        const startNode = nodes.get(config.entry);
        if (!startNode) {
            throw new Error(`Entry node not found: ${config.entry}`);
        }

        // Determine flow type based on node types
        const hasAsyncNodes = Array.from(nodes.values()).some(node => node instanceof AsyncNode);
        const hasBatchNodes = Array.from(nodes.values()).some(node => node instanceof BatchNode || node instanceof AsyncBatchNode);

        let flow;
        if (hasAsyncNodes && hasBatchNodes) {
            flow = new AsyncBatchFlow();
        } else if (hasAsyncNodes) {
            flow = new AsyncFlow();
        } else if (hasBatchNodes) {
            flow = new Flow(); // Regular Flow can handle BatchNodes
        } else {
            flow = new Flow();
        }

        flow.start(startNode);
        flow.setParams(config.globals || {});

        return {
            flow,
            nodes,
            config
        };
    }
}

// Meta Agent Creator - AI agent that creates other agents from descriptions
class MetaAgentCreator {
    constructor(llmClient) {
        this.llm = llmClient;
        this.compiler = new PocketFlowCompiler({ llm: llmClient });
    }

    async createAgentFromDescription(description, options = {}) {
        // Load the schema to guide the LLM
        const schema = require('./schema.json');
        
        const prompt = `Create a simple PocketFlow JSON for: "${description}"

Use this EXACT structure:
{
    "version": "pf-js/1.0",
    "entry": "input",
    "globals": { "model": "gpt-4o-mini" },
    "nodes": [
        {
            "id": "input",
            "kind": "data", 
            "post": { "next": "summarize" }
        },
        {
            "id": "summarize",
            "kind": "llm",
            "exec": { "prompt": "Summarize: {{ctx.text}}" },
            "post": { 
                "outputs": { "save": [{ "path": "summary", "value": "{{result}}" }] },
                "next": "output"
            }
        },
        {
            "id": "output",
            "kind": "data"
        }
    ],
    "edges": [
        { "from": "input", "to": "summarize", "label": "summarize" },
        { "from": "summarize", "to": "output", "label": "output" }
    ]
}

Return ONLY this JSON structure, no other text.`;

        try {
            const response = await this.llm.call({ prompt });
            
            // Extract JSON from response (handle cases where LLM adds extra text)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in LLM response');
            }
            
            const config = JSON.parse(jsonMatch[0]);
            
            // Validate the configuration against schema
            this.validateConfig(config);
            this.validateAgainstSchema(config);
            
            return {
                success: true,
                config: config,
                compiled: this.compiler.compile(config)
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                config: null,
                compiled: null
            };
        }
    }

    validateConfig(config) {
        if (!config.version || !config.entry || !config.nodes || !config.edges) {
            throw new Error('Invalid config: missing required fields (version, entry, nodes, edges)');
        }
        
        if (!Array.isArray(config.nodes) || config.nodes.length === 0) {
            throw new Error('Config must have at least one node');
        }
        
        if (!Array.isArray(config.edges)) {
            throw new Error('Config must have edges array');
        }
        
        // Check that entry node exists
        const nodeIds = config.nodes.map(n => n.id);
        if (!nodeIds.includes(config.entry)) {
            throw new Error(`Entry node '${config.entry}' not found in nodes`);
        }
        
        // Check that all edge references are valid
        for (const edge of config.edges) {
            if (!nodeIds.includes(edge.from)) {
                throw new Error(`Edge references missing node: ${edge.from}`);
            }
            if (!nodeIds.includes(edge.to)) {
                throw new Error(`Edge references missing node: ${edge.to}`);
            }
        }
        
        // Validate edge routing consistency
        this.validateEdgeRouting(config);
    }

    validateAgainstSchema(config) {
        const schema = require('./schema.json');
        
        // Basic schema validation (you could use ajv for more comprehensive validation)
        const requiredFields = schema.required || [];
        for (const field of requiredFields) {
            if (!(field in config)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        // Validate version format
        if (config.version && !/^pf-js\/\d+\.\d+$/.test(config.version)) {
            throw new Error(`Invalid version format: ${config.version}. Expected format: pf-js/1.0`);
        }
        
        // Validate node kinds
        const validKinds = schema.properties.nodes.items.properties.kind.enum || [];
        for (const node of config.nodes) {
            if (node.kind && !validKinds.includes(node.kind)) {
                throw new Error(`Invalid node kind: ${node.kind}. Valid kinds: ${validKinds.join(', ')}`);
            }
        }
        
        // Validate edge structure
        for (const edge of config.edges) {
            const requiredEdgeFields = ['from', 'to'];
            for (const field of requiredEdgeFields) {
                if (!(field in edge)) {
                    throw new Error(`Missing required edge field: ${field}`);
                }
            }
        }
    }

    validateEdgeRouting(config) {
        // Create a map of node actions to validate edge consistency
        const nodeActions = new Map();
        
        for (const node of config.nodes) {
            const actions = new Set(['default']); // Always include default
            
            // Check if node has specific next actions
            if (node.post && node.post.next) {
                actions.add(node.post.next);
            }
            
            // Check for router cases
            if (node.kind === 'router' && node.exec && node.exec.cases) {
                for (const case_ of node.exec.cases) {
                    if (case_.label) {
                        actions.add(case_.label);
                    }
                }
            }
            
            nodeActions.set(node.id, actions);
        }
        
        // Validate each edge
        for (const edge of config.edges) {
            const fromNode = config.nodes.find(n => n.id === edge.from);
            if (!fromNode) continue;
            
            const validActions = nodeActions.get(edge.from);
            const edgeLabel = edge.label || 'default';
            
            if (!validActions.has(edgeLabel)) {
                throw new Error(`Invalid edge routing: Node '${edge.from}' cannot route to '${edge.to}' with label '${edgeLabel}'. Valid actions: ${Array.from(validActions).join(', ')}`);
            }
        }
    }

    async createAndRunAgent(description, shared = {}, options = {}) {
        const result = await this.createAgentFromDescription(description, options);
        
        if (!result.success) {
            throw new Error(`Failed to create agent: ${result.error}`);
        }
        
        // Run the compiled agent
        const { flow } = result.compiled;
        const executionResult = await flow.run(shared);
        
        return {
            success: true,
            config: result.config,
            executionResult: executionResult,
            shared: shared
        };
    }
}

// Export for Node.js or browser
const classes = { PocketFlowCompiler, MetaAgentCreator };
if (typeof module !== 'undefined' && module.exports) module.exports = classes;
else if (typeof window !== 'undefined') window.PocketFlowCompiler = classes;

// Example usage:
/*
const { PocketFlowCompiler } = require('./compiler.js');

const config = {
    version: "pf-js/1.0",
    entry: "start",
    globals: { model: "gpt-4o-mini" },
    nodes: [
        {
            id: "start",
            kind: "llm",
            exec: { prompt: "Hello {{ctx.name}}!" },
            post: { outputs: { save: [{ path: "greeting", value: "{{result.text}}" }] } }
        }
    ],
    edges: []
};

const env = {
    llm: {
        async call({ prompt, model }) {
            // Your LLM implementation
            return { text: `Response to: ${prompt}` };
        }
    }
};

const compiler = new PocketFlowCompiler(env);
const { flow } = compiler.compile(config);

// Run the flow
const shared = { name: "World" };
await flow.run(shared);
console.log(shared.greeting);
*/
