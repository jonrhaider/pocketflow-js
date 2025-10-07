# Agent

Agent is a powerful design pattern in which nodes can take dynamic actions based on the context.

## Implement Agent with Graph

1. **Context and Action:** Implement nodes that supply context and perform actions.  
2. **Branching:** Use branching to connect each action node to an agent node. Use action to allow the agent to direct the [flow](../core_abstraction/flow.md) between nodes—and potentially loop back for multi-step.
3. **Agent Node:** Provide a prompt to decide action—for example:

```javascript
const agentPrompt = `
### CONTEXT
Task: ${taskDescription}
Previous Actions: ${previousActions}
Current State: ${currentState}

### ACTION SPACE
[1] search
  Description: Use web search to get results
  Parameters:
    - query (str): What to search for

[2] answer
  Description: Conclude based on the results
  Parameters:
    - result (str): Final answer to provide

### NEXT ACTION
Decide the next action based on the current context and available action space.
Return your response in the following format:

\`\`\`yaml
thinking: |
    
action: 
parameters:
    : 
\`\`\`
`;
```

The core of building **high-performance** and **reliable** agents boils down to:

1. **Context Management:** Provide *relevant, minimal context.* For example, rather than including an entire chat history, retrieve the most relevant via [RAG](./rag.md). Even with larger context windows, LLMs still fall victim to ["lost in the middle"](https://arxiv.org/abs/2307.03172), overlooking mid-prompt content.

2. **Action Space:** Provide *a well-structured and unambiguous* set of actions—avoiding overlap like separate `read_databases` or  `read_csvs`. Instead, import CSVs into the database.

## Example Good Action Design

- **Incremental:** Feed content in manageable chunks (500 lines or 1 page) instead of all at once.

- **Overview-zoom-in:** First provide high-level structure (table of contents, summary), then allow drilling into details (raw texts).

- **Parameterized/Programmable:** Instead of fixed actions, enable parameterized (columns to select) or programmable (SQL queries) actions, for example, to read CSV files.

- **Backtracking:** Let the agent undo the last step instead of restarting entirely, preserving progress when encountering errors or dead ends.

## Example: Search Agent

This agent:
1. Decides whether to search or answer
2. If searches, loops back to decide if more search needed
3. Answers when enough context gathered

```javascript
class DecideAction extends Node {
    prep(shared) {
        const context = shared.get("context", "No previous search");
        const query = shared["query"];
        return { query, context };
    }
    
    async exec(inputs) {
        const { query, context } = inputs;
        const prompt = `
Given input: ${query}
Previous search results: ${context}
Should I: 1) Search web for more info 2) Answer with current knowledge
Output in yaml:
\`\`\`yaml
action: search/answer
reason: why this action
search_term: search phrase if action is search
\`\`\``;
        
        const resp = await callLLM(prompt);
        const yamlStr = resp.split("```yaml")[1].split("```")[0].trim();
        const result = yaml.parse(yamlStr);
        
        if (!result || !result.action || !result.reason) {
            throw new Error("Invalid response format");
        }
        if (!["search", "answer"].includes(result.action)) {
            throw new Error("Invalid action");
        }
        if (result.action === "search" && !result.search_term) {
            throw new Error("Search term required for search action");
        }
        
        return result;
    }

    post(shared, prepRes, execRes) {
        if (execRes.action === "search") {
            shared["search_term"] = execRes["search_term"];
        }
        return execRes["action"];
    }
}

class SearchWeb extends Node {
    prep(shared) {
        return shared["search_term"];
    }
        
    async exec(searchTerm) {
        return await searchWeb(searchTerm);
    }
    
    post(shared, prepRes, execRes) {
        const prevSearches = shared.get("context", []);
        shared["context"] = prevSearches.concat([{
            term: shared["search_term"],
            result: execRes
        }]);
        return "decide";
    }
}

class DirectAnswer extends Node {
    prep(shared) {
        return { query: shared["query"], context: shared.get("context", "") };
    }
        
    async exec(inputs) {
        const { query, context } = inputs;
        return await callLLM(`Context: ${context}\nAnswer: ${query}`);
    }

    post(shared, prepRes, execRes) {
        console.log(`Answer: ${execRes}`);
        shared["answer"] = execRes;
    }
}

// Connect nodes
const decide = new DecideAction();
const search = new SearchWeb();
const answer = new DirectAnswer();

decide.next(search, "search");
decide.next(answer, "answer");
search.next(decide, "decide"); // Loop back

const flow = new Flow(decide);
await flow.run({ query: "Who won the Nobel Prize in Physics 2024?" });
```