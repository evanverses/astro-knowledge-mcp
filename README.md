# 🚀 Building a Local RAG MCP Server for Astro, React & TypeScript

Welcome! If you've ever found yourself constantly context-switching between your IDE and documentation tabs for Astro, React, or TypeScript, this project is for you.

Today, I'm going to walk you through how I built **Astro Knowledge MCP**—a local Model Context Protocol (MCP) server that acts as a specialized knowledge base for your AI agents.

## 🧠 The Concepts: What are we actually building?

Before we dive into the code, let's clarify the three pillars of this project:

1.  **MCP (Model Context Protocol):** Think of this as a universal USB-C port for AI. It's an open standard that allows AI models (like Claude or Gemini) to connect to external tools and data sources without custom integrations for every single app. We are building a "Server" that exposes a tool to search documentation.
2.  **RAG (Retrieval-Augmented Generation):** LLMs are frozen in time. They don't know about the specific version of Astro you are using or the latest React patterns. RAG allows us to _retrieve_ relevant snippets of documentation based on your query and _augment_ the AI's prompt with that context.
3.  **Local Embeddings:** Instead of paying for your favourite LLM API to turn text into numbers (vectors), we are running a small, efficient model locally on your CPU. Privacy-first and free!

## 🧰 The Toolbox: Libraries Used

We are standing on the shoulders of giants here. Here is the stack:

- **`@modelcontextprotocol/sdk`**: The official SDK to create our MCP server.
- **`@lancedb/lancedb`**: A serverless, embedded vector database. It stores our documentation chunks and performs the similarity search.
- **`@xenova/transformers`**: This lets us run Hugging Face models (specifically `all-MiniLM-L6-v2`) directly in Node.js.
- **`zod`**: For defining and validating the schema of our MCP tools.
- **`glob` & `gray-matter`**: For finding markdown files and parsing their frontmatter.
- **`execa`, `ora`, `chalk`, `inquirer`**: To build a beautiful CLI for downloading and refreshing documentation.

---

## 🏗️ Step-by-Step: Building the Project

### 1. The Architecture

The project is split into four distinct parts:

1.  **Database Layer (`database.js`)**: Handles the connection to LanceDB and loads the embedding model.
2.  **Refresher (`refresh.js`)**: A CLI tool that downloads fresh documentation from the libraries's pages. Astro is mandatory, but others are optional.
3.  **Ingestion (`ingest.js`)**: Processes markdown files into vectors.
4.  **The Server (`index.js`)**: The MCP server that listens for requests from your AI agent.

### 2. The Database Layer

We use a singleton pattern to ensure we only load the embedding model once.

- **Embeddings:** We use `Xenova/all-MiniLM-L6-v2`. It's quantized, meaning it's fast and lightweight enough to run on your laptop's CPU without a GPU.
- **LanceDB:** We connect to a local folder `data/astro-knowledge-lancedb`. No Docker containers required!

### 3. Ingestion: From Markdown to Vectors

In `ingest.js`, we perform the magic:

1.  **Glob:** Find all `.md` and `.mdx` files in our `docs/` folder.
2.  **Chunking:** We split the content by double newlines (`\n\n`). This keeps paragraphs together.
3.  **Embedding:** We pass each chunk through our transformer model to get a 384-dimensional vector.
4.  **Storage:** We save the text, title, path, and vector into LanceDB.

### 4. The MCP Server

In `index.js`, we define a tool called `ask_astro_docs`.

```typescript
server.tool(
  "ask_astro_docs",
  {
    question: z.string().describe("The user's technical question..."),
  },
  async ({ question }) => {
    // Logic to embed question -> search LanceDB -> return text
  },
);
```

When the AI calls this tool, we convert the user's question into a vector and ask LanceDB for the "nearest neighbors"—the documentation chunks that are semantically closest to the question.

---

## ✅ Objectives Achieved

- **Zero API Costs:** By using local embeddings and a local vector DB, this costs $0 to run.
- **High Relevance:** We can specifically target the documentation we care about (Astro, React, Tailwind).
- **Offline Capable:** Once the docs are downloaded, you don't even need internet access to query them.
- **Agentic Workflow:** This isn't just a search bar; it's a tool that an Agent can decide to use whenever it needs help writing code.

---

## 🔄 How to Refresh the Data

Documentation changes fast, so I've built a robust CLI tool in `refresh.js` to handle this.

To update your knowledge base:

```bash
node dist/refresh.js
#or
npm run refresh
```

**What happens under the hood:**

1.  **Interactive Menu:** It asks you which docs you want (Astro is mandatory, others are optional).
2.  **Git Sparse Checkout:** It doesn't clone the entire history of the React repo (which is huge). It uses `git sparse-checkout` to only pull the specific documentation folders.
3.  **Auto-Ingest:** Once downloaded, it automatically triggers the ingestion script to re-index the database.

---

## 🤖 Implementing the MCP Server

Now for the fun part: connecting this to your AI.

### Prerequisites

Ensure you have built the project:

```bash
npm install
npm run build # or tsc
```

### Option 1: Claude Desktop App

To use this with Claude, you need to edit your configuration file.

**MacOS Config Path:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Add this to the `mcpServers` object:

```json
{
  "mcpServers": {
    "astro-knowledge": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/YOUR/PROJECT/dist/index.js"]
    }
  }
}
```

_Make sure to replace `/ABSOLUTE/PATH/TO/YOUR/PROJECT` with the actual path._

Restart Claude, and you should see a 🔌 icon indicating the tool is connected. You can now ask: _"How do I create a new collection in Astro?"_ and it will query your local database!

### Option 2: Gemini & Other Clients

For any client supporting MCP via Stdio (Standard Input/Output), the configuration is similar. You point the client to the executable command:

- **Command:** `node`
- **Args:** `['/path/to/dist/index.js']`

---

## 🚀 Conclusion

I've built a private, local, and highly specific search engine for my coding assistant. By leveraging MCP, we've decoupled the "knowledge" from the "model", allowing us to swap models or upgrade our documentation without breaking the workflow.
