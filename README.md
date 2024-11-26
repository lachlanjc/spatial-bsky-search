# Bluesky Spatial Semantic Search

I’ve combined my 1) desire to re-surface content from my Bluesky feed 2) embeddings & semantic search and 3) my love of infinite canvas UIs:

![Screenshot of a masonry grid of bluesky posts all showing pet photos, with a search field that says "pet" and a filter for "has photo" enabled](https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:5clwkdkmns2fk7luffo6efol/bafkreidvooa2czyrqstsizhnbedok7vrzztglbrtts4hjqwqup3l3k5gue@jpeg)

It’s an OpenAI embeddings-powered search tool for my Bluesky likes, with advanced filtering, on an infinite canvas with draggable results. I started this project last spring [for my Twitter likes + bookmarks](https://edu.lachlanjc.com/2024-05-07_shm_spatial_semantic_twitter_search), and since adapted it to Bluesky.

Right now you can only run it locally or self-host it; I’m not offering a hosted version.

## Running it yourself

(Using [Bun](https://bun.sh/) because it’s excellent for scripting)

1. Clone repo, `cd`
2. `bun i`
3. Copy `.env.sample` into `.env`, and fill out the API credentials. You’ll need an OpenAI API key, your Bsky handle (e.g. `lachlanjc.com`), plus a Bsky App Password
4. Install [Chroma](https://trychroma.com), then in another terminal, `chroma run` (you’ll need to keep this running both for the download scripts and querying the embeddings database)
5. If you’re using [Zed](https://zed.dev), spawn the task for download, then for embedding. Otherwise, `bun run lib/tasks/download.js` then `bun run lib/tasks/embed.js`
6. `bun dev` & open the link!

## Open source libraries

- Next.js site
- [Chroma](https://trychroma.com) for embeddings database
- [`umap-js`](https://github.com/PAIR-code/umap-js) for positioning posts
- [React Flow](https://reactflow.dev/) for infinite canvas
- [`bsky-react-post`](https://bsky-react-post.rhinobase.io/) for post embeds
- [Radix Themes](https://www.radix-ui.com/) for search UI

---

MIT License
