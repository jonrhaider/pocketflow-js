# Workflow

Many real-world tasks are too complex for one LLM call. The solution is to **Task Decomposition**: decompose them into a [chain](../core_abstraction/flow.md) of multiple Nodes.

> - You don't want to make each task **too coarse**, because it may be *too complex for one LLM call*.
> - You don't want to make each task **too granular**, because then *the LLM call doesn't have enough context* and results are *not consistent across nodes*.
> 
> You usually need multiple *iterations* to find the *sweet spot*. If the task has too many *edge cases*, consider using [Agents](./agent.md).
{: .best-practice }

### Example: Article Writing

```javascript
class GenerateOutline extends Node {
    prep(shared) { 
        return shared["topic"]; 
    }
    
    async exec(topic) { 
        return await callLLM(`Create a detailed outline for an article about ${topic}`); 
    }
    
    post(shared, prepRes, execRes) { 
        shared["outline"] = execRes; 
    }
}

class WriteSection extends Node {
    prep(shared) { 
        return shared["outline"]; 
    }
    
    async exec(outline) { 
        return await callLLM(`Write content based on this outline: ${outline}`); 
    }
    
    post(shared, prepRes, execRes) { 
        shared["draft"] = execRes; 
    }
}

class ReviewAndRefine extends Node {
    prep(shared) { 
        return shared["draft"]; 
    }
    
    async exec(draft) { 
        return await callLLM(`Review and improve this draft: ${draft}`); 
    }
    
    post(shared, prepRes, execRes) { 
        shared["final_article"] = execRes; 
    }
}

// Connect nodes
const outline = new GenerateOutline();
const write = new WriteSection();
const review = new ReviewAndRefine();

outline.next(write);
write.next(review);

// Create and run flow
const writingFlow = new Flow(outline);
const shared = { "topic": "AI Safety" };
await writingFlow.run(shared);
```

For *dynamic cases*, consider using [Agents](./agent.md).
