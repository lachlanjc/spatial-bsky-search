import { ChromaClient, IncludeEnum, OpenAIEmbeddingFunction } from "chromadb";
const client = new ChromaClient();
const COLLECTION_NAME = "bluesky-canvas";

// initialize embedder to create embeddings from user query
const embedder = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY ?? "",
});

const collection = await client.getCollection({
  name: COLLECTION_NAME,
  embeddingFunction: embedder,
});

const items = await collection.peek();
// const items = await collection.query({
//   nResults: 25,
//   queryTexts: "bsky",
//   include: [IncludeEnum.Embeddings, IncludeEnum.Metadatas],
//   where: {},
// });

console.log(items);
