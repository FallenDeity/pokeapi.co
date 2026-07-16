import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi'
import tailwindcss from '@tailwindcss/vite'
import { bundle } from '@readme/openapi-parser';
import { parse, stringify } from 'yaml';
import * as fs from 'fs';


const fetchOpenAPISchema = async () => {
  const document = await bundle('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/openapi.yml');

  const schema = parse(stringify(document));

  if (schema.paths) {
    for (const path of Object.keys(schema.paths)) {
      for (const method of Object.keys(schema.paths[path])) {
        delete schema.paths[path][method]?.security;
      }
    }
  }

  delete schema.components?.securitySchemes;

  // save in public openapi.yml
  fs.writeFileSync('./public/openapi.yml', stringify(schema));
};


// await fetchOpenAPISchema();

export default defineConfig({
  site: 'https://pokeapi.co',
  base: '',
  // trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'PokéAPI',
      favicon: './src/assets/pokeapi_192_square.png',
      tableOfContents: {
        maxHeadingLevel: 2,
      },
      components: {
        Footer: './src/components/PokeFooter.astro',
        Header: './src/components/PokeHeader.astro',
        SocialIcons: './src/components/SocialIcons.astro',
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
            schema: 'https://raw.githubusercontent.com/FallenDeity/pokeapi/refs/heads/openapi-security/openapi.yml',
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
      ],
    }),
  ],
  vite: { plugins: [tailwindcss()] },
})
