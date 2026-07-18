import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi'
import tailwindcss from '@tailwindcss/vite'
import { stringify } from 'yaml'
import { bundle } from '@readme/openapi-parser'
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function processOpenAPISchema(schemaUrl) {
  const schema = await bundle(schemaUrl);

  for (const operations of Object.values(schema.paths ?? {})) {
    for (const operation of Object.values(operations)) {
      if (operation && typeof operation === "object") {
        delete operation.security;
      }
    }
  }

  const publicDir = resolve("./public");
  await mkdir(publicDir, { recursive: true });
  await writeFile(resolve(publicDir, "openapi.yml"), stringify(schema), "utf-8");

  return './public/openapi.yml';
}


export default defineConfig({
  site: 'https://pokeapi.co',
  base: '',
  // trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'PokéAPI',
      favicon: '/favicon.png',
      tableOfContents: {
        maxHeadingLevel: 4,
      },
      routeMiddleware: './src/routeData.ts',
      components: {
        Footer: './src/components/PokeFooter.astro',
        Header: './src/components/PokeHeader.astro',
        SocialIcons: './src/components/SocialIcons.astro',
        ThemeSelect: './src/components/ThemeToggle.astro',
        MarkdownContent: './src/components/PokeMarkdownContent.astro',
      },
      customCss: [
        './src/styles/global.css',
      ],
      logo: {
        src: './src/assets/pokeapi_256.png',
        replacesTitle: true,
      },
      social: [
        { icon: 'github', label: 'Github', href: 'https://github.com/pokeapi/pokeapi' },
        { icon: 'slack', label: 'Slack', href: 'https://pokeapi.slack.com/' },
      ],
      plugins: [
        starlightOpenAPI([
          {
            base: `/v2/openapi`,
            label: 'OpenAPI',
            schema: await processOpenAPISchema('https://raw.githubusercontent.com/FallenDeity/pokeapi/refs/heads/metadata-api-schema/openapi.yml'),
            sidebar: {
              tags: {
                sort: 'alphabetical',
              },
            },
            snippets: {
              operation: {
                clients: {
                  go: ['nethttp'],
                  java: ['okhttp', 'nethttp'],
                  javascript: ['fetch', 'axios'],
                  rust: ['reqwest'],
                  shell: ['curl', 'wget'],
                },
                default: { target: 'javascript', client: 'fetch' },
              },
            },
          },
        ]),
      ],
      sidebar: [
        {
          label: 'About',
          link: 'about',
        },
        {
          label: 'API',
          items: [
            {
              label: 'V2',
              link: 'v2',
            },
            ...openAPISidebarGroups,
          ],
        },
        {
          label: 'GraphQL',
          link: 'graphql',
          badge: 'v1beta',
        },
        {
          label: 'How-To Guides',
          collapsed: true,
          items: [
            { autogenerate: { directory: 'how-tos' } }
          ],
        },
      ],
    }),
  ],
  vite: { plugins: [tailwindcss()] },
})
