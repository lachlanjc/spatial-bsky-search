// This file is abanbdoned. See pages/api/search for newer/functioning version

import { type NextRequest } from "next/server";
import { ChromaClient, OpenAIEmbeddingFunction } from "chromadb";
import { UMAP } from "umap-js";
import db from "@/tweets-processed.json";

function normalize(arrayOfNumbers: number[][]) {
  // find max and min in the array
  let max = [0, 0];
  let min = [0, 0];
  for (let i = 0; i < arrayOfNumbers.length; i++) {
    for (let j = 0; j < 2; j++) {
      if (arrayOfNumbers[i][j] > max[j]) {
        max[j] = arrayOfNumbers[i][j];
      }
      if (arrayOfNumbers[i][j] < min[j]) {
        min[j] = arrayOfNumbers[i][j];
      }
    }
  }
  // normalize
  for (let i = 0; i < arrayOfNumbers.length; i++) {
    for (let j = 0; j < 2; j++) {
      arrayOfNumbers[i][j] =
        (arrayOfNumbers[i][j] - min[j]) / (max[j] - min[j]);
    }
  }
  return arrayOfNumbers;
}

export async function queryTweets(query: string) {
  const client = new ChromaClient();
  const COLLECTION_NAME = "bluesky-canvas";

  // initialize embedder to create embeddings from user query
  // const embedder = new OpenAIEmbeddingFunction({
  //   openai_api_key: process.env.OPENAI_API_KEY ?? "",
  // });

  // const collection = await client.getCollection({
  //   name: COLLECTION_NAME,
  //   embeddingFunction: embedder,
  // });

  // query items in ChromaDB with give query phrase
  // const items = await collection.query({
  //   nResults: 12,
  //   queryTexts: query,
  //   include: ["embeddings", "metadatas"],
  // });

  const items = {
    ids: [[]],
    embeddings: [],
    metadatas: [],
  };

  const records = (items.ids[0] ?? []).map((id, i) => {
    // const metadata = items.metadatas[0][i];
    const tweet = db.find((tweet) => tweet.id_str === id);
    return {
      id,
      tweet,
    };
  });

  // const umap = new UMAP({
  //   nNeighbors: 2,
  //   minDist: 0.001,
  //   spread: 5,
  //   nComponents: 2, // dimensions
  // });
  // let fittings = umap.fit(items.embeddings?.[0] ?? []);
  // fittings = normalize(fittings); // normalize to 0-1

  const results = records.map((record, i) => ({
    ...record,
    // fitting: fittings[i],
  }));

  return results;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q");

  // throw an error if query param is not defined
  if (!query) {
    return Response.json(
      {
        error: "Please provide search query phrase",
      },
      { status: 403 },
    );
  }

  // don'send empty reponse if query is less than 3 chars
  if (query.length < 3) {
    return Response.json(
      {
        error: "Please provide longer search query phrase",
      },
      { status: 403 },
    );
  }

  const results = await queryTweets(query);

  return Response.json(results);
}

// when testing with bun run
// const result = await queryTweets("visionos");
// console.log(result);
