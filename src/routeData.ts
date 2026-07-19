import {defineRouteMiddleware} from "@astrojs/starlight/route-data";
import resourceLists from "./data/operations/resource-lists.json";
import berries from "./data/operations/berries.json";
import contests from "./data/operations/contests.json";
import encounters from "./data/operations/encounters.json";
import evolution from "./data/operations/evolution.json";
import games from "./data/operations/games.json";
import items from "./data/operations/items.json";
import locations from "./data/operations/locations.json";
import machines from "./data/operations/machines.json";
import moves from "./data/operations/moves.json";
import pokemon from "./data/operations/pokemon.json";
import utility from "./data/operations/utility.json";

const tocMapping: Record<string, any[]> = {
  "resource-listspagination-group": resourceLists,
  "berries-group": berries,
  "contests-group": contests,
  "encounters-group": encounters,
  "evolution-group": evolution,
  "games-group": games,
  "items-group": items,
  "locations-group": locations,
  "machines-group": machines,
  "moves-group": moves,
  "pokemon-group": pokemon,
  "utility-group": utility,
};

const PageCategory = {
  OPENAPI: "openapi",
  GUIDES: "guides",
  API_V2: "api-v2",
  DOCUMENTATION: "documentation",
} as const;

type PageCategoryType = typeof PageCategory[keyof typeof PageCategory];

const CATEGORY_KEYWORDS: Record<PageCategoryType, string[]> = {
  [PageCategory.OPENAPI]: ["openapi", "swagger", "schema", "endpoints", "developer", "reference"],
  [PageCategory.GUIDES]: ["guide", "tutorial", "how-to", "integration", "examples"],
  [PageCategory.API_V2]: ["explorer", "console", "RESTful", "resource", "endpoints"],
  [PageCategory.DOCUMENTATION]: ["documentation", "RESTful", "web service"],
};

export const onRequest = defineRouteMiddleware((context) => {
  const { starlightRoute } = context.locals;
  
  const base = new URL(import.meta.env.BASE_URL, context.site);
  const ogImageUrl = new URL(`og/${starlightRoute.id || "index"}.png`, base);

  const routeId = starlightRoute.id || "";
  let calculatedCategory: PageCategoryType = PageCategory.DOCUMENTATION;
  if (routeId.startsWith("v2/openapi")) {
    calculatedCategory = PageCategory.OPENAPI;
  } else if (routeId.startsWith("how-tos")) {
    calculatedCategory = PageCategory.GUIDES;
  } else if (routeId.startsWith("v2")) {
    calculatedCategory = PageCategory.API_V2;
  }

  const entryData = (starlightRoute.entry as any)?.data || {};
  const category = entryData.category || calculatedCategory;

  const baseKeywords = ["pokeapi", "pokemon", "api"];
  const categorySpecific = CATEGORY_KEYWORDS[calculatedCategory];
  
  let customKeywords: string[] = [];
  if (entryData.keywords) {
    customKeywords = Array.isArray(entryData.keywords)
      ? entryData.keywords
      : entryData.keywords.split(",").map((k: string) => k.trim());
  }

  const mergedKeywords = Array.from(new Set([...baseKeywords, ...categorySpecific, ...customKeywords]));
  const keywordsStr = mergedKeywords.join(", ");

  starlightRoute.head.push(
    {
      tag: "meta",
      attrs: {property: "og:image", content: ogImageUrl.href},
    },
    {
      tag: "meta",
      attrs: {name: "twitter:image", content: ogImageUrl.href},
    },
    {
      tag: "meta",
      attrs: {name: "twitter:card", content: "summary_large_image"},
    },
    {
      tag: "meta",
      attrs: {name: "theme-color", content: "#ef4444", media: "(prefers-color-scheme: light)"},
    },
    {
      tag: "meta",
      attrs: {name: "theme-color", content: "#2563eb", media: "(prefers-color-scheme: dark)"},
    },
    {
      tag: "meta",
      attrs: {name: "category", content: category},
    },
    {
      tag: "meta",
      attrs: {name: "keywords", content: keywordsStr},
    },
    {
      tag: "meta",
      attrs: {name: "robots", content: "index, follow"},
    },
  );

  if (starlightRoute.id === "v2/index" || starlightRoute.id === "v2") {
    if (starlightRoute.toc && starlightRoute.toc.items) {
      starlightRoute.toc.items = starlightRoute.toc.items.map((item) => {
        const endpoints = tocMapping[item.slug];
 
        if (endpoints) {
          const children = endpoints.map((endpoint) => ({
            depth: 3,
            slug: endpoint.name,
            text: endpoint.name,
            children: [],
          }));

          return {
            ...item,
            children: [...item.children, ...children],
          };
        }

        return item;
      });
    }
  }
});
