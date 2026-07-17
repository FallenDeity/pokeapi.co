import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import resourceLists from './data/operations/resource-lists.json';
import berries from './data/operations/berries.json';
import contests from './data/operations/contests.json';
import encounters from './data/operations/encounters.json';
import evolution from './data/operations/evolution.json';
import games from './data/operations/games.json';
import items from './data/operations/items.json';
import locations from './data/operations/locations.json';
import machines from './data/operations/machines.json';
import moves from './data/operations/moves.json';
import pokemon from './data/operations/pokemon.json';
import utility from './data/operations/utility.json';

const tocMapping: Record<string, any[]> = {
  'resource-listspagination-group': resourceLists,
  'berries-group': berries,
  'contests-group': contests,
  'encounters-group': encounters,
  'evolution-group': evolution,
  'games-group': games,
  'items-group': items,
  'locations-group': locations,
  'machines-group': machines,
  'moves-group': moves,
  'pokemon-group': pokemon,
  'utility-group': utility,
};

export const onRequest = defineRouteMiddleware((context) => {
  const { starlightRoute } = context.locals;

  // Only apply to the API page (v2)
  if (starlightRoute.id === 'v2/index' || starlightRoute.id === 'v2') {
    if (starlightRoute.toc && starlightRoute.toc.items) {
      starlightRoute.toc.items = starlightRoute.toc.items.map((item) => {
        // Debug slug mapping if needed: console.log('TOC Slug:', item.slug);
        const endpoints = tocMapping[item.slug];

        if (endpoints) {
          const children = endpoints.map((endpoint) => ({
            depth: 3,
            // The id of the heading in ResourceSection.astro is exactly endpoint.name
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
