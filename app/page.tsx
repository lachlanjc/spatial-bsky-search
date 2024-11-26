"use client";
import {
  type Dispatch,
  type SetStateAction,
  type CSSProperties,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useTheme } from "next-themes";
import { useRouter, useSearchParams } from "next/navigation";
import { EmbeddedPost } from "bsky-react-post";
import type { AppBskyFeedDefs } from "@atproto/api";

import {
  Text,
  Flex,
  Grid,
  Select,
  Spinner,
  TextField,
  Container,
  Button,
  IconButton,
  type ButtonProps,
} from "@radix-ui/themes";
import {
  ReactFlow,
  Controls,
  Background,
  Panel,
  useNodesState,
  BackgroundVariant,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CrossCircledIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";

const SUGGESTED_SEARCHES: Record<string, ButtonProps["color"]> = {
  AI: "pink",
  Apple: "red",
  CSS: "orange",
  JavaScript: "yellow",
  Figma: "green",
  Bluesky: "blue",
  animation: "indigo",
  design: "violet",
};

interface Result {
  id: string;
  fitting: [number, number];
  // metadata: {
  //   bookmarked: boolean;
  //   favorited: boolean;
  //   retweeted: boolean;
  // };
  post: AppBskyFeedDefs.ThreadViewPost;
}

function PostNode({
  data,
}: {
  // data: Pick<Result, "post" | "metadata">;
  data: Result; // ["post"];
}) {
  console.log(data);
  return <EmbeddedPost thread={data} />;
}

const nodeTypes = { post: PostNode };
const [GRID_WIDTH, GRID_HEIGHT] = [600 + 50, 50 * 2];
const GRID_POSITION_HEIGHT = 50 * 6;

function positionItems(items: Array<Result>) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const width = window.innerWidth * 2;
  const height = window.innerHeight * 3;
  const seenCoords = new Set();

  const nodes = items.map((item) => {
    let x =
      Math.round((Math.random() * (item.fitting[0] * width)) / GRID_WIDTH) *
      GRID_WIDTH;
    let y =
      Math.round(
        (Math.random() * (item.fitting[1] * height)) / GRID_POSITION_HEIGHT,
      ) * GRID_POSITION_HEIGHT;
    let coordKey = [x, y].join(",");
    console.log(coordKey, seenCoords.size, seenCoords.has(coordKey));
    while (seenCoords.has(coordKey)) {
      x += GRID_WIDTH;
      y += GRID_HEIGHT * 3;
      coordKey = [x, y].join(",");
    }
    seenCoords.add(coordKey);
    return {
      id: item.id,
      type: "post",
      data: {
        post: item.post,
        // metadata: item.metadata,
      },
      position: { x, y },
    };
  });

  return nodes;
}

function searchPosts(
  params: URLSearchParams,
  setNodes: (typeof useNodesState)[1],
  setIsLoading: Dispatch<SetStateAction<boolean>>,
) {
  fetch(`/api/search?${params.toString()}`)
    .then((res) => res.json())
    .then((data) => positionItems(data))
    .then((nodes) => setNodes(nodes))
    .then(() => setIsLoading(false));
}

const FORM_STATE = {
  q: "",
  kind: "any",
  link: "any",
  media: "any",
  // interaction: "any",
};

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formState, setFormState] = useState(FORM_STATE);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { theme } = useTheme();

  const searchFormWith = useCallback(
    (field: keyof typeof FORM_STATE, newValue: string) => {
      setIsLoading(true);
      setFormState((obj) => ({ ...obj, [field]: newValue }));
      if (field !== "q") {
        document.getElementById("search")!.blur();
      }
      startTransition(() => {
        const params = new URLSearchParams();
        const { q, kind, media, link } = {
          ...formState,
          // @ts-expect-error we know it's a field of FORM_STATE
          [field]: newValue,
        };
        console.log("FORM STATE", formState);
        params.set("q", q);
        params.set("kind", kind);
        params.set("link", link);
        params.set("media", media);
        // params.set("interaction", interaction);

        if (q.trim().length === 0) {
          // router.replace("/");
          setNodes([]);
          setIsLoading(false);
        } else {
          searchPosts(params, setNodes, setIsLoading);
          router.replace(`/?${params.toString()}`);
        }
      });
    },
    [setFormState, setIsLoading, setNodes],
  );

  // Read formState from URL params
  useEffect(() => {
    if (searchParams) {
      setIsLoading(true);
      const q = searchParams.get("q") || "";
      const kind = searchParams.get("kind") || FORM_STATE.kind;
      const link = searchParams.get("link") || FORM_STATE.link;
      const media = searchParams.get("media") || FORM_STATE.media;
      // const interaction =
      //   searchParams.get("interaction") || FORM_STATE.interaction;
      setFormState({ q, media, kind, link });
      // TODO: Sanitize input
      startTransition(() => {
        searchPosts(searchParams, setNodes, setIsLoading);
      });
    }
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        elevateNodesOnSelect
        nodesFocusable={false}
        nodesConnectable={false}
        snapToGrid
        snapGrid={[GRID_WIDTH / 2, GRID_HEIGHT]}
        panOnScroll
        proOptions={{ hideAttribution: true }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
        colorMode={theme === "dark" ? "dark" : "light"}
      >
        <MiniMap />
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} gap={55} size={2} />
        <Panel position="top-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            style={{
              paddingBlock: 24,
              position: "sticky",
              top: 0,
              zIndex: 4,
            }}
          >
            <div className="blur">
              <div
                className="blur-layer"
                style={{ "--index": 1 } as CSSProperties}
              />
              <div
                className="blur-layer"
                style={{ "--index": 2 } as CSSProperties}
              />
              <div
                className="blur-layer"
                style={{ "--index": 3 } as CSSProperties}
              />
              <div
                className="blur-layer"
                style={{ "--index": 4 } as CSSProperties}
              />
            </div>
            <Container maxWidth="680px">
              <TextField.Root
                placeholder="Search posts…"
                variant="classic"
                type="search"
                id="search"
                onChange={(e) => {
                  setFormState((val) => ({ ...val, q: e.target.value }));
                }}
                value={formState.q}
                onBlur={(e) => {
                  searchFormWith("q", e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                autoFocus
                size="3"
                radius="full"
                style={{ width: "100%", position: "relative", zIndex: 5 }}
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon height="16" width="16" />
                </TextField.Slot>
                <TextField.Slot>
                  {isPending || isLoading ? (
                    <Spinner />
                  ) : (
                    formState.q.trim().length > 0 && (
                      <IconButton
                        onClick={() => {
                          setFormState(FORM_STATE);
                          setNodes([]);
                        }}
                        title="Clear"
                        variant="ghost"
                        color="gray"
                      >
                        <CrossCircledIcon width="16" height="16" />
                      </IconButton>
                    )
                  )}
                </TextField.Slot>
              </TextField.Root>
              <Grid columns="3" gap="3" mt="3">
                <Select.Root
                  name="kind"
                  defaultValue="any"
                  onValueChange={(val) => searchFormWith("kind", val)}
                >
                  <Select.Trigger variant="classic" radius="full" />
                  <Select.Content variant="soft" position="popper">
                    <Select.Item value="any">Any type</Select.Item>
                    <Select.Item value="standalone">Standalone</Select.Item>
                    <Select.Item value="quote">Quotes</Select.Item>
                    <Select.Item value="reply">Replies</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Select.Root
                  name="link"
                  defaultValue="any"
                  onValueChange={(val) => searchFormWith("link", val)}
                >
                  <Select.Trigger variant="classic" radius="full" />
                  <Select.Content variant="soft" position="popper">
                    <Select.Item value="any">Any links</Select.Item>
                    <Select.Item value="mention">Has mention</Select.Item>
                    <Select.Item value="url">Has URL</Select.Item>
                    <Select.Item value="hashtag">Has hashtag</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Select.Root
                  name="media"
                  defaultValue="any"
                  onValueChange={(val) => searchFormWith("media", val)}
                >
                  <Select.Trigger variant="classic" radius="full" />
                  <Select.Content variant="soft" position="popper">
                    <Select.Item value="any">Any media</Select.Item>
                    <Select.Item value="photo">Has photo</Select.Item>
                    <Select.Item value="gif" disabled>
                      Has GIF
                    </Select.Item>
                    <Select.Item value="video">Has video</Select.Item>
                  </Select.Content>
                </Select.Root>
                {/* <Select.Root
                  name="interaction"
                  defaultValue="any"
                  onValueChange={(val) => searchFormWith("interaction", val)}
                >
                  <Select.Trigger variant="classic" radius="full" />
                  <Select.Content variant="soft" position="popper">
                    <Select.Item value="any">Any interaction</Select.Item>
                    <Select.Item value="favorited">Liked</Select.Item>
                    <Select.Item value="bookmarked">Bookmarked</Select.Item>
                  </Select.Content>
                </Select.Root> */}
              </Grid>
            </Container>
          </form>
        </Panel>
        <Panel position="bottom-center">
          {nodes.length === 0 &&
            !isLoading &&
            (formState.q.trim().length > 0 ? (
              <Text size="3" color="gray" mb="4">
                No posts found
              </Text>
            ) : (
              <Flex direction="column" align="center" gap="4" p="4">
                <Text size="3" color="gray" weight="bold">
                  Suggested searches
                </Text>
                <Flex gap="4">
                  {Object.keys(SUGGESTED_SEARCHES).map((topic) => (
                    <Button
                      variant="soft"
                      radius="full"
                      color={SUGGESTED_SEARCHES[topic]}
                      onClick={() => searchFormWith("q", topic)}
                      key={topic}
                    >
                      {topic}
                    </Button>
                  ))}
                </Flex>
              </Flex>
            ))}
        </Panel>
      </ReactFlow>
    </div>
  );
}
