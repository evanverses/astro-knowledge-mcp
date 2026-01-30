import * as lancedb from "@lancedb/lancedb";
import { pipeline, env } from "@xenova/transformers";

// 1. Force Native Execution
// This prevents it from trying to load the WASM backend
env.backends.onnx.wasm.numThreads = 1; // Prevent WASM multi-threading issues if it mistakenly loads
env.useBrowserCache = false; // Don't use browser caching mechanisms
env.allowLocalModels = true; // Allow loading from local file system if needed

// Define the shape of your data
export interface DocRecord {
  id: string;       
  content: string;  
  title: string;    
  path: string;     
  vector: number[]; 
  [key: string]: any; // Allow extra properties for LanceDB compatibility
}

export async function getDbConnection() {
  // Ensure the data directory exists or is accessible
  const db = await lancedb.connect("data/astro-knowledge-lancedb");
  return db;
}

// Singleton for the embedding model
let embedder: any = null;

export async function getEmbeddings(text: string): Promise<number[]> {
  if (!embedder) {
    console.error("⚡ Loading embedding model (Native CPU)...");
    
    // 'quantized: true' makes it 2x faster with minimal accuracy loss
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      quantized: true,
    });
    
    console.error("✅ Model loaded.");
  }

  // Generate the vector
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}