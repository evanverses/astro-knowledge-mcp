// test-search.ts
import { getDbConnection, getEmbeddings } from "./src/database.js";

async function main() {
  // 1. The question we want to ask our docs
  const query = "What is Astro?";
  
  console.log(`🔎 Searching for: "${query}"...`);

  try {
    // 2. Convert question to vector
    const vector = await getEmbeddings(query);

    // 3. Open the database
    const db = await getDbConnection();
    const table = await db.openTable("docs");

    // 4. Search
    const results = await table
      .vectorSearch(vector)
      .limit(1) // Get the single best match
      .toArray();

    // 5. Show results
    if (results.length > 0) {
      console.log("\n✅ Found a match!");
      console.log(`📄 Source: ${results[0].title}`);
      console.log(`📝 Content snippet: ${results[0].content.substring(0, 150)}...`);
    } else {
      console.log("\n❌ No results found. Did you run 'src/ingest.ts'?");
    }
  } catch (error) {
    console.error("Error during search:", error);
  }
}

main();