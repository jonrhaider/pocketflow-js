# Map Reduce

MapReduce is a design pattern suitable when you have either:
- Large input data (e.g., multiple files to process), or
- Large output data (e.g., multiple forms to fill)

and there is a logical way to break the task into smaller, ideally independent parts. 

You first break down the task using [BatchNode](../core_abstraction/batch.md) in the map phase, followed by aggregation in the reduce phase.

### Example: Document Summarization

```javascript
class SummarizeAllFiles extends BatchNode {
    prep(shared) {
        const filesDict = shared["files"]; // e.g. 10 files
        return Object.entries(filesDict); // [["file1.txt", "aaa..."], ["file2.txt", "bbb..."], ...]
    }

    async exec(oneFile) {
        const [filename, fileContent] = oneFile;
        const summaryText = await callLLM(`Summarize the following file:\n${fileContent}`);
        return [filename, summaryText];
    }

    post(shared, prepRes, execResList) {
        const fileSummaries = {};
        for (const [filename, summary] of execResList) {
            fileSummaries[filename] = summary;
        }
        shared["file_summaries"] = fileSummaries;
    }
}

class CombineSummaries extends Node {
    prep(shared) {
        return shared["file_summaries"];
    }

    async exec(fileSummaries) {
        // format as: "File1: summary\nFile2: summary...\n"
        const textList = [];
        for (const [fname, summ] of Object.entries(fileSummaries)) {
            textList.push(`${fname} summary:\n${summ}\n`);
        }
        const bigText = textList.join("\n---\n");

        return await callLLM(`Combine these file summaries into one final summary:\n${bigText}`);
    }

    post(shared, prepRes, finalSummary) {
        shared["all_files_summary"] = finalSummary;
    }
}

const batchNode = new SummarizeAllFiles();
const combineNode = new CombineSummaries();
batchNode.next(combineNode);

const flow = new Flow(batchNode);

const shared = {
    "files": {
        "file1.txt": "Alice was beginning to get very tired of sitting by her sister...",
        "file2.txt": "Some other interesting text ...",
        // ...
    }
};
await flow.run(shared);
console.log("Individual Summaries:", shared["file_summaries"]);
console.log("\nFinal Summary:\n", shared["all_files_summary"]);
```

> **Performance Tip**: The example above works sequentially. You can speed up the map phase by running it in parallel. See [(Advanced) Parallel](../core_abstraction/parallel.md) for more details.
