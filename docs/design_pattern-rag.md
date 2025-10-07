# RAG (Retrieval Augmented Generation)

For certain LLM tasks like answering questions, providing relevant context is essential. One common architecture is a **two-stage** RAG pipeline:

1. **Offline stage**: Preprocess and index documents ("building the index").
2. **Online stage**: Given a question, generate answers by retrieving the most relevant context.

## Stage 1: Offline Indexing

We create three Nodes:
1. `ChunkDocs` – [chunks](../utility_function/chunking.md) raw text.
2. `EmbedDocs` – [embeds](../utility_function/embedding.md) each chunk.
3. `StoreIndex` – stores embeddings into a [vector database](../utility_function/vector.md).

```javascript
class ChunkDocs extends BatchNode {
    prep(shared) {
        // A list of file paths in shared["files"]. We process each file.
        return shared["files"];
    }

    async exec(filepath) {
        // read file content. In real usage, do error handling.
        const fs = require('fs');
        const text = fs.readFileSync(filepath, 'utf8');
        // chunk by 100 chars each
        const chunks = [];
        const size = 100;
        for (let i = 0; i < text.length; i += size) {
            chunks.push(text.slice(i, i + size));
        }
        return chunks;
    }
    
    post(shared, prepRes, execResList) {
        // execResList is a list of chunk-lists, one per file.
        // flatten them all into a single list of chunks.
        const allChunks = [];
        for (const chunkList of execResList) {
            allChunks.push(...chunkList);
        }
        shared["all_chunks"] = allChunks;
    }
}

class EmbedDocs extends BatchNode {
    prep(shared) {
        return shared["all_chunks"];
    }

    async exec(chunk) {
        return await getEmbedding(chunk);
    }

    post(shared, prepRes, execResList) {
        // Store the list of embeddings.
        shared["all_embeds"] = execResList;
        console.log(`Total embeddings: ${execResList.length}`);
    }
}

class StoreIndex extends Node {
    prep(shared) {
        // We'll read all embeds from shared.
        return shared["all_embeds"];
    }

    async exec(allEmbeds) {
        // Create a vector index (faiss or other DB in real usage).
        const index = await createIndex(allEmbeds);
        return index;
    }

    post(shared, prepRes, index) {
        shared["index"] = index;
    }
}

// Wire them in sequence
const chunkNode = new ChunkDocs();
const embedNode = new EmbedDocs();
const storeNode = new StoreIndex();

chunkNode.next(embedNode);
embedNode.next(storeNode);

const OfflineFlow = new Flow(chunkNode);
```

Usage example:

```javascript
const shared = {
    "files": ["doc1.txt", "doc2.txt"], // any text files
};
await OfflineFlow.run(shared);
```

## Stage 2: Online Query & Answer

We have 3 nodes:
1. `EmbedQuery` – embeds the user's question.
2. `RetrieveDocs` – retrieves top chunk from the index.
3. `GenerateAnswer` – calls the LLM with the question + chunk to produce the final answer.

```javascript
class EmbedQuery extends Node {
    prep(shared) {
        return shared["question"];
    }

    async exec(question) {
        return await getEmbedding(question);
    }

    post(shared, prepRes, qEmb) {
        shared["q_emb"] = qEmb;
    }
}

class RetrieveDocs extends Node {
    prep(shared) {
        // We'll need the query embedding, plus the offline index/chunks
        return { qEmb: shared["q_emb"], index: shared["index"], chunks: shared["all_chunks"] };
    }

    async exec(inputs) {
        const { qEmb, index, chunks } = inputs;
        const [I, D] = await searchIndex(index, qEmb, 1);
        const bestId = I[0][0];
        const relevantChunk = chunks[bestId];
        return relevantChunk;
    }

    post(shared, prepRes, relevantChunk) {
        shared["retrieved_chunk"] = relevantChunk;
        console.log("Retrieved chunk:", relevantChunk.slice(0, 60), "...");
    }
}

class GenerateAnswer extends Node {
    prep(shared) {
        return { question: shared["question"], chunk: shared["retrieved_chunk"] };
    }

    async exec(inputs) {
        const { question, chunk } = inputs;
        const prompt = `Question: ${question}\nContext: ${chunk}\nAnswer:`;
        return await callLLM(prompt);
    }

    post(shared, prepRes, answer) {
        shared["answer"] = answer;
        console.log("Answer:", answer);
    }
}

const embedQnode = new EmbedQuery();
const retrieveNode = new RetrieveDocs();
const generateNode = new GenerateAnswer();

embedQnode.next(retrieveNode);
retrieveNode.next(generateNode);
const OnlineFlow = new Flow(embedQnode);
```

Usage example:

```javascript
// Suppose we already ran OfflineFlow and have:
// shared["all_chunks"], shared["index"], etc.
shared["question"] = "Why do people like cats?";

await OnlineFlow.run(shared);
// final answer in shared["answer"]
```
