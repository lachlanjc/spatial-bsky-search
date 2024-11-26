import { AtpAgent } from "@atproto/api";

const identifier = process.env.BS_USER;
const password = process.env.BS_PASSWORD;
const agent = new AtpAgent({ service: "https://bsky.social" });
const user = await agent.login({ identifier, password });

const fetchAllLikes = async (agent, actorDid, limitPerPage = 100) => {
  let likes = [];
  let cursor = undefined;
  let lastCursor = undefined;

  while (true) {
    const response = await agent.getActorLikes({
      actor: actorDid,
      limit: limitPerPage,
      cursor,
    });

    // Add the current page of likes to the total list
    const newLikes = response.data.feed.map((posts) => posts.post);
    console.log(`Fetching page with cursor: ${cursor}`);
    console.log(`Likes so far: ${likes.length}`);
    likes = likes.concat(newLikes);

    // Check if there's a next page
    if (
      response.data.cursor &&
      response.data.cursor !== lastCursor &&
      newLikes.length > 0
    ) {
      lastCursor = cursor; // Update the previous cursor
      cursor = response.data.cursor; // Move to the next page
    } else {
      break; // Exit loop if no cursor or same cursor as before
    }
  }

  return likes;
};

const posts = await fetchAllLikes(agent, user.data.did);
// TODO: filter out replies that don't have a link, image, or video

console.log(`${posts.length} posts downloaded`);

Bun.write("lib/db/likes.json", JSON.stringify(posts));
