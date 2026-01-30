import fs from "fs";
import path from "path";
import { glob } from "glob";
import matter from "gray-matter";
import { getDbConnection, getEmbeddings, DocRecord } from "./database.js";

const DOCS_DIR = "./docs"; // ⚠️ CHANGE THIS to your actual docs folder path

async function ingestDocs() {
  console.log("🚀 Starting ingestion...");
  
  const db = await getDbConnection();
  
  // 1. Find all markdown/mdx files
  const files = await glob(`${DOCS_DIR}/**/*.{md,mdx}`);
  console.log(`📂 Found ${files.length} files.`);

  const records: DocRecord[] = [];

  for (const file of files) {
    const rawContent = fs.readFileSync(file, "utf-8");
    const { data: frontmatter, content } = matter(rawContent);

    // Simple chunking: Split by double newlines to keep paragraphs together
    // For better accuracy, you can use a recursive character splitter later
    const chunks = content.split("\n\n").filter((c) => c.length > 50);

    console.log(`Processing: ${file} (${chunks.length} chunks)`);

    for (const [index, chunk] of chunks.entries()) {
      const vector = await getEmbeddings(chunk);
      
      records.push({
        id: `${file}#${index}`,
        content: chunk.trim(),
        title: frontmatter.title || path.basename(file),
        path: file,
        vector: vector,
      });
    }
  }

  if (records.length === 0) {
    console.log("⚠️ No records to ingest.");
    return;
  }

  // 2. Create or Overwrite the Table
  // The embedding dimension for all-MiniLM-L6-v2 is 384
  const table = await db.createTable("docs", records, { mode: "overwrite" });
  
  console.log(`✅ Successfully ingested ${records.length} chunks into LanceDB!`);
}

ingestDocs().catch(console.error);