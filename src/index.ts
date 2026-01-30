import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getDbConnection, getEmbeddings } from "./database.js";


const server = new McpServer({
  name: "astro-knowledge-server",
  version: "1.0.0",
});

server.tool(
  "ask_astro_docs",
  {
    question: z.string().describe("The user's technical question about Astro, React, or TypeScript."),
  },
  async ({ question }) => {
    try {
      // 1. Convert the user's question into a vector
      const queryVector = await getEmbeddings(question);

      // 2. Connect to the DB and open the table
      const db = await getDbConnection();
      const table = await db.openTable("docs");

      // 3. Search for the top 5 most relevant chunks
      // 'vectorSearch' finds the nearest neighbors in the high-dimensional space
      const results = await table
        .vectorSearch(queryVector)
        .limit(5)
        .toArray();

      // 4. Format the results for the AI
      // We combine the title and content into a single readable block
      const contextText = results
        .map((r) => `## Source: ${r.title}\n${r.content}`)
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Here is the relevant documentation I found:\n\n${contextText}`,
          },
        ],
      };
    } catch (error) {
      console.error("Search failed:", error);
      return {
        content: [
          {
            type: "text",
            text: "I encountered an error searching the documentation. Please check if the database is initialized.",
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server using Stdio (Standard Input/Output)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Astro Knowledge MCP Server running on stdio");
}

main();