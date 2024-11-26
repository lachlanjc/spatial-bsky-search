// Why is this under Pages Router? That's a great question!
// Strangely, Next.js is not able ro run `chromadb` in a Route Handler under App Router.
// It throws the following error:
// /node_modules/onnxruntime-node/bin/napi-v3/darwin/arm64/onnxruntime_binding.node
// Module parse failed: Unexpected character '�' (1:0)

// Running it under Pages Router works fine though ¯\_(ツ)_/¯

import type { NextApiRequest, NextApiResponse } from "next";
import { ChromaClient, IncludeEnum, OpenAIEmbeddingFunction } from "chromadb";
import type { Where } from "chromadb";
import { UMAP } from "umap-js";
import db from "@/lib/db/likes.json";

function normalize(fitting: number[][]) {
  // find max and min in the array
  let max = [0, 0];
  let min = [0, 0];
  for (let i = 0; i < fitting.length; i++) {
    for (let j = 0; j < 2; j++) {
      max[j] = Math.max(max[j], fitting[i][j]);
      min[j] = Math.min(min[j], fitting[i][j]);
    }
  }

  // normalize
  for (let i = 0; i < fitting.length; i++) {
    for (let j = 0; j < 2; j++) {
      fitting[i][j] = (fitting[i][j] - min[j]) / (max[j] - min[j]);
    }
  }

  return fitting;
}

export async function queryPosts(
  query: string,
  qFilters: {
    kind: string;
    link: string;
    media: string;
    interaction: string;
  },
) {
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

  const filters: Record<string, boolean> = {};
  switch (qFilters.media) {
    case "image":
      filters.hasImage = true;
      break;
    case "video":
      filters.hasVideo = true;
      break;
    case "gif":
      filters.hasGif = true;
      break;
  }
  switch (qFilters.link) {
    case "url":
      filters.hasLink = true;
      // query += " https://";
      break;
    case "hashtag":
      filters.hasHashtag = true;
      break;
    case "mention":
      filters.hasMention = true;
      break;
  }
  switch (qFilters.kind) {
    case "standalone":
      filters.isReply = false;
      filters.isQuote = false;
      break;
    case "quote":
      filters.isQuote = true;
      break;
    case "reply":
      filters.isReply = true;
      break;
  }
  // if (
  //   qFilters.interaction != null &&
  //   ["liked", "bookmarked", "retweeted"].includes(
  //     qFilters.interaction.toString(),
  //   )
  // ) {
  //   filters[qFilters.interaction] = true;
  // }

  const where: Where = {};
  if (Object.keys(filters).length > 1) {
    where["$and"] = Object.entries(filters).map(([k, v]) => ({
      [k]: { $eq: Number(v) },
    }));
  } else if (Object.keys(filters).length === 1) {
    const [k, v] = Object.entries(filters)[0];
    // @ts-expect-error this is functionally the same as above
    where[k] = { $eq: Number(v) };
  }

  console.log(query, qFilters, filters, JSON.stringify(where, null, 2));

  // query items in ChromaDB with give query phrase
  const items = await collection.query({
    nResults: 24,
    queryTexts: query,
    include: [IncludeEnum.Embeddings, IncludeEnum.Metadatas],
    where: {},
  });

  if (items.ids == null || items.ids?.length === 0) {
    return [];
  }

  // const items = {
  //   ids: [[]],
  //   embeddings: [],
  //   metadatas: [],
  // };

  // :   Array<{
  //   id: string;
  //   tweet: db[number];
  //   fitting: [number, number];
  // }>
  const records = (items.ids[0] ?? [])
    .map((id, i) => {
      // const metadata = items.metadatas[0][i];
      const post = db.find((post) => post.uri === id);
      if (!post) return null;
      return {
        id,
        fitting: [0, 0],
        // metadata,
        post,
      };
    })
    .filter(Boolean);

  if (records.length > 2) {
    const umap = new UMAP({
      nNeighbors: 2,
      // minDist: 0.001,
      spread: 5,
      nComponents: 2, // dimensions
    });
    let fittings = umap.fit(items.embeddings?.[0] ?? []);
    fittings = normalize(fittings); // normalize to 0-1

    records.forEach((_, i) => {
      records[i]!.fitting = fittings[i];
    });
  } else {
    records.forEach((_, i) => {
      records[i]!.fitting = [0, 0];
    });
  }

  return records;
}

export default async function GET(req: NextApiRequest, res: NextApiResponse) {
  const query = req.query.q;
  const kind = req.query.kind?.toString() ?? "any";
  const link = req.query.link?.toString() ?? "any";
  const media = req.query.media?.toString() ?? "any";
  const interaction = req.query.interaction?.toString() ?? "any";

  // throw an error if query param is not defined
  if (!query) {
    return res
      .status(403)
      .json({ error: "Please provide search query phrase" });
  }

  // don'send empty reponse if query is less than 2 chars
  if (query.length < 2) {
    return res
      .status(403)
      .json({ error: "Please provide longer search query phrase" });
  }

  const results = await queryPosts(query.toString(), {
    kind,
    link,
    media,
    interaction,
  });

  console.log(`Returning ${results.length} results`);

  return res.json(results);
}
