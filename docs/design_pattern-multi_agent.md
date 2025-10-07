# (Advanced) Multi-Agents

Multiple [Agents](./agent.md) can work together by handling subtasks and communicating the progress. 
Communication between agents is typically implemented using message queues in shared storage.

> Most of time, you don't need Multi-Agents. Start with a simple solution first.
{: .best-practice }

### Example Agent Communication: Message Queue

Here's a simple example showing how to implement agent communication using `asyncio.Queue`. 
The agent listens for messages, processes them, and continues listening:

```javascript
class AgentNode extends AsyncNode {
    async prepAsync(shared) {
        const messageQueue = this.params["messages"];
        const message = await messageQueue.get();
        console.log(`Agent received: ${message}`);
        return message;
    }

    async execAsync(message) {
        // Process the message
        return `Processed: ${message}`;
    }

    async postAsync(shared, prepRes, execRes) {
        console.log(`Agent response: ${execRes}`);
        return "continue";
    }
}

// Create node and flow
const agent = new AgentNode();
agent.next(agent); // connect to self
const flow = new AsyncFlow(agent);

// Create heartbeat sender
async function sendSystemMessages(messageQueue) {
    let counter = 0;
    const messages = [
        "System status: all systems operational",
        "Memory usage: normal",
        "Network connectivity: stable",
        "Processing load: optimal"
    ];
    
    while (true) {
        const message = `${messages[counter % messages.length]} | timestamp_${counter}`;
        await messageQueue.put(message);
        counter++;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function main() {
    const messageQueue = new AsyncQueue();
    const shared = {};
    flow.setParams({ "messages": messageQueue });
    
    // Run both coroutines
    await Promise.all([
        flow.runAsync(shared),
        sendSystemMessages(messageQueue)
    ]);
}

main();
```

The output:

```
Agent received: System status: all systems operational | timestamp_0
Agent received: Memory usage: normal | timestamp_1
Agent received: Network connectivity: stable | timestamp_2
Agent received: Processing load: optimal | timestamp_3
```

### Interactive Multi-Agent Example: Taboo Game

Here's a more complex example where two agents play the word-guessing game Taboo. 
One agent provides hints while avoiding forbidden words, and another agent tries to guess the target word:

```javascript
class AsyncHinter extends AsyncNode {
    async prepAsync(shared) {
        const guess = await shared["hinter_queue"].get();
        if (guess === "GAME_OVER") {
            return null;
        }
        return {
            target: shared["target_word"],
            forbidden: shared["forbidden_words"],
            pastGuesses: shared.get("past_guesses", [])
        };
    }

    async execAsync(inputs) {
        if (inputs === null) {
            return null;
        }
        const { target, forbidden, pastGuesses } = inputs;
        let prompt = `Generate hint for '${target}'\nForbidden words: ${forbidden.join(', ')}`;
        if (pastGuesses.length > 0) {
            prompt += `\nPrevious wrong guesses: ${pastGuesses.join(', ')}\nMake hint more specific.`;
        }
        prompt += "\nUse at most 5 words.";
        
        const hint = await callLLM(prompt);
        console.log(`\nHinter: Here's your hint - ${hint}`);
        return hint;
    }

    async postAsync(shared, prepRes, execRes) {
        if (execRes === null) {
            return "end";
        }
        await shared["guesser_queue"].put(execRes);
        return "continue";
    }
}

class AsyncGuesser extends AsyncNode {
    async prepAsync(shared) {
        const hint = await shared["guesser_queue"].get();
        return {
            hint,
            pastGuesses: shared.get("past_guesses", [])
        };
    }

    async execAsync(inputs) {
        const { hint, pastGuesses } = inputs;
        const prompt = `Given hint: ${hint}, past wrong guesses: ${pastGuesses.join(', ')}, make a new guess. Directly reply a single word:`;
        const guess = await callLLM(prompt);
        console.log(`Guesser: I guess it's - ${guess}`);
        return guess;
    }

    async postAsync(shared, prepRes, execRes) {
        if (execRes.toLowerCase() === shared["target_word"].toLowerCase()) {
            console.log("Game Over - Correct guess!");
            await shared["hinter_queue"].put("GAME_OVER");
            return "end";
        }
        
        if (!shared["past_guesses"]) {
            shared["past_guesses"] = [];
        }
        shared["past_guesses"].push(execRes);
        
        await shared["hinter_queue"].put(execRes);
        return "continue";
    }
}

async function main() {
    // Set up game
    const shared = {
        "target_word": "nostalgia",
        "forbidden_words": ["memory", "past", "remember", "feeling", "longing"],
        "hinter_queue": new AsyncQueue(),
        "guesser_queue": new AsyncQueue()
    };
    
    console.log("Game starting!");
    console.log(`Target word: ${shared["target_word"]}`);
    console.log(`Forbidden words: ${shared["forbidden_words"]}`);

    // Initialize by sending empty guess to hinter
    await shared["hinter_queue"].put("");

    // Create nodes and flows
    const hinter = new AsyncHinter();
    const guesser = new AsyncGuesser();

    // Set up flows
    const hinterFlow = new AsyncFlow(hinter);
    const guesserFlow = new AsyncFlow(guesser);

    // Connect nodes to themselves
    hinter.next(hinter, "continue");
    guesser.next(guesser, "continue");

    // Run both agents concurrently
    await Promise.all([
        hinterFlow.runAsync(shared),
        guesserFlow.runAsync(shared)
    ]);
}

main();
```

The Output:

```
Game starting!
Target word: nostalgia
Forbidden words: ['memory', 'past', 'remember', 'feeling', 'longing']

Hinter: Here's your hint - Thinking of childhood summer days
Guesser: I guess it's - popsicle

Hinter: Here's your hint - When childhood cartoons make you emotional
Guesser: I guess it's - nostalgic

Hinter: Here's your hint - When old songs move you
Guesser: I guess it's - memories

Hinter: Here's your hint - That warm emotion about childhood
Guesser: I guess it's - nostalgia
Game Over - Correct guess!
```
