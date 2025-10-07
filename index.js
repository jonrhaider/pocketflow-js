// PocketFlow JavaScript - Minimalist LLM framework
class BaseNode {
    constructor() { this.params = {}; this.successors = {}; }
    setParams(params) { this.params = params; }
    next(node, action = "default") { 
        if (action in this.successors) console.warn(`Overwriting successor for action '${action}'`);
        this.successors[action] = node; return node; 
    }
    prep(shared) {}
    exec(prepRes) {}
    post(shared, prepRes, execRes) {}
    _exec(prepRes) { return this.exec(prepRes); }
    async _run(shared) { const p = this.prep(shared); return this.post(shared, p, await this._exec(p)); }
    async run(shared) { 
        if (Object.keys(this.successors).length > 0) console.warn("Node won't run successors. Use Flow.");
        return await this._run(shared); 
    }
    rshift(other) { return this.next(other); }
    sub(action) { 
        if (typeof action !== 'string') throw new TypeError("Action must be a string");
        return new ConditionalTransition(this, action); 
    }
}

class ConditionalTransition {
    constructor(src, action) { this.src = src; this.action = action; }
    rshift(tgt) { return this.src.next(tgt, this.action); }
}

class Node extends BaseNode {
    constructor(maxRetries = 1, wait = 0) { super(); this.maxRetries = maxRetries; this.wait = wait; this.curRetry = 0; }
    execFallback(prepRes, exc) { throw exc; }
    async _exec(prepRes) {
        for (this.curRetry = 0; this.curRetry < this.maxRetries; this.curRetry++) {
            try { return await this.exec(prepRes); }
            catch (e) {
                if (this.curRetry === this.maxRetries - 1) return await this.execFallback(prepRes, e);
                if (this.wait > 0) await new Promise(resolve => setTimeout(resolve, this.wait * 1000));
            }
        }
    }
}

class BatchNode extends Node {
    async _exec(items) { return Promise.all((items || []).map(item => super._exec(item))); }
}

class Flow extends BaseNode {
    constructor(start = null) { super(); this.startNode = start; }
    start(start) { this.startNode = start; return start; }
    getNextNode(curr, action) { 
        const nxt = curr.successors[action || "default"];
        if (!nxt && Object.keys(curr.successors).length > 0) {
            console.warn(`Flow ends: '${action}' not found in [${Object.keys(curr.successors)}]`);
        }
        return nxt;
    }
    async _orch(shared, params = null) {
        let curr = { ...this.startNode };
        Object.setPrototypeOf(curr, Object.getPrototypeOf(this.startNode));
        const p = params || { ...this.params };
        let lastAction = null;
        while (curr) {
            curr.setParams(p);
            lastAction = await curr._run(shared);
            const nextNode = this.getNextNode(curr, lastAction);
            if (nextNode) { curr = { ...nextNode }; Object.setPrototypeOf(curr, Object.getPrototypeOf(nextNode)); }
            else curr = null;
        }
        return lastAction;
    }
    async _run(shared) { return this.post(shared, this.prep(shared), await this._orch(shared)); }
    post(shared, prepRes, execRes) { return execRes; }
}

class BatchFlow extends Flow {
    async _run(shared) {
        const pr = this.prep(shared) || [];
        for (const bp of pr) await this._orch(shared, { ...this.params, ...bp });
        return this.post(shared, pr, null);
    }
}

class AsyncNode extends Node {
    async prepAsync(shared) {}
    async execAsync(prepRes) {}
    async execFallbackAsync(prepRes, exc) { throw exc; }
    async postAsync(shared, prepRes, execRes) {}
    async _exec(prepRes) {
        for (this.curRetry = 0; this.curRetry < this.maxRetries; this.curRetry++) {
            try { return await this.execAsync(prepRes); }
            catch (e) {
                if (this.curRetry === this.maxRetries - 1) return await this.execFallbackAsync(prepRes, e);
                if (this.wait > 0) await new Promise(resolve => setTimeout(resolve, this.wait * 1000));
            }
        }
    }
    async _runAsync(shared) { const p = await this.prepAsync(shared); return await this.postAsync(shared, p, await this._exec(p)); }
    async runAsync(shared) { 
        if (Object.keys(this.successors).length > 0) console.warn("Node won't run successors. Use AsyncFlow.");
        return await this._runAsync(shared); 
    }
    _run(shared) { throw new Error("Use runAsync."); }
}

class AsyncBatchNode extends AsyncNode {
    async _exec(items) { const results = []; for (const item of (items || [])) results.push(await super._exec(item)); return results; }
}

class AsyncParallelBatchNode extends AsyncNode {
    async _exec(items) { return await Promise.all((items || []).map(item => super._exec(item))); }
}

class AsyncFlow extends Flow {
    async prepAsync(shared) {}
    async postAsync(shared, prepRes, execRes) { return execRes; }
    async _orchAsync(shared, params = null) {
        let curr = { ...this.startNode };
        Object.setPrototypeOf(curr, Object.getPrototypeOf(this.startNode));
        const p = params || { ...this.params };
        let lastAction = null;
        while (curr) {
            curr.setParams(p);
            lastAction = curr instanceof AsyncNode ? await curr._runAsync(shared) : await curr._run(shared);
            const nextNode = this.getNextNode(curr, lastAction);
            if (nextNode) { curr = { ...nextNode }; Object.setPrototypeOf(curr, Object.getPrototypeOf(nextNode)); }
            else curr = null;
        }
        return lastAction;
    }
    async _runAsync(shared) { return await this.postAsync(shared, await this.prepAsync(shared), await this._orchAsync(shared)); }
    async runAsync(shared) { return await this._runAsync(shared); }
}

class AsyncBatchFlow extends AsyncFlow {
    async _runAsync(shared) {
        const pr = await this.prepAsync(shared) || [];
        for (const bp of pr) await this._orchAsync(shared, { ...this.params, ...bp });
        return await this.postAsync(shared, pr, null);
    }
}

class AsyncParallelBatchFlow extends AsyncFlow {
    async _runAsync(shared) {
        const pr = await this.prepAsync(shared) || [];
        await Promise.all(pr.map(bp => this._orchAsync(shared, { ...this.params, ...bp })));
        return await this.postAsync(shared, pr, null);
    }
}

// Helper functions for operator-like syntax
function connect(nodeA, nodeB) { return nodeA.rshift(nodeB); }
function conditionalConnect(nodeA, action, nodeB) { return nodeA.sub(action).rshift(nodeB); }

// Export for Node.js or browser
const classes = { BaseNode, Node, BatchNode, Flow, BatchFlow, ConditionalTransition, AsyncNode, AsyncBatchNode, AsyncParallelBatchNode, AsyncFlow, AsyncBatchFlow, AsyncParallelBatchFlow, connect, conditionalConnect };
if (typeof module !== 'undefined' && module.exports) module.exports = classes;
else if (typeof window !== 'undefined') window.PocketFlow = classes;