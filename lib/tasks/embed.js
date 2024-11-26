import { ChromaClient, OpenAIEmbeddingFunction } from "chromadb";

const posts = await Bun.file("lib/db/likes.json")
  .text()
  .then((text) => JSON.parse(text))
  .then((posts) => posts.slice(0, 2048));

const client = new ChromaClient();

// special class which will be passed to client and automatically create embeddings
const embedder = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY,
});

const COLLECTION_NAME = "bluesky-canvas";

// delete collections to remove stale records
await client.deleteCollection({ name: COLLECTION_NAME });

// create a collection
// note that we pass embedder that will automtically create embeddings
// with OpenAI Embeddings API
const collection = await client.createCollection({
  name: COLLECTION_NAME,
  embeddingFunction: embedder,
});

const documents = posts.map((post) => {
  let text = `${post.author.displayName} (${post.author.handle}): ${post.record.text}`;
  // Check if the post has facets (metadata for links, mentions, etc.)
  if (post.facets) {
    for (const facet of post.facets) {
      if (facet.features) {
        for (const feature of facet.features) {
          if (feature.$type === "app.bsky.richtext.facet#link") {
            // Replace the truncated URL with the full URL
            const link = feature.uri;
            const start = facet.index.byteStart;
            const end = facet.index.byteEnd;

            // Replace the text segment containing the URL
            text = text.slice(0, start) + link + text.slice(end);
          }
        }
      }
    }
  }
  // Append alt text from image embeds
  if (post.embed && post.embed.images) {
    const imageAltTexts = post.embed.images
      .map((img) => img.alt)
      .filter(Boolean);
    if (imageAltTexts.length > 0) {
      text += "\n\n" + imageAltTexts.join("\n");
    }
  }

  return text;
});

console.log(documents);

const database = {
  ids: posts.map((i) => i.uri),
  metadatas: posts.map((post) => ({
    isReply: post.record.reply?.parent?.uri?.startsWith("at") ? 1 : 0,
    isQuote: Number(post.embed?.["$type"] === "app.bsky.embed.record#view"),

    hasVideo: Number(post.embed?.["$type"] === "app.bsky.embed.video#view"),
    hasGif: Number(0), // :(
    hasImage: Number(post.embed?.images?.length > 0),

    hasLink: Number(
      post.record.embed?.media?.["$type"] === "app.bsky.embed.external",
    ),
    hasHashtag: Number(
      post.record.facets?.some(
        (facet) =>
          facet.features?.some(
            (ft) => ft.$type === "app.bsky.richtext.facet#tag",
          ) ?? false,
      ) ?? false,
    ),
    hasMention: Number(
      post.record.facets?.some(
        (facet) =>
          facet.features?.some(
            (ft) => ft.$type === "app.bsky.richtext.facet#mention",
          ) ?? false,
      ) ?? false,
    ),

    // bookmarked: Number(tw.bookmarked),
    // favorited: Number(tw.favorited),
    // retweeted: Number(tw.retweeted),
  })),
  documents,
};
console.log(database);

// feed data into new collection
// note that we don't pass embeddings, however they will be created behind the scenes
await collection.add(database);

console.log(
  `Saved ${posts.length} tweets to ChromaDB collection ${COLLECTION_NAME}`,
);
