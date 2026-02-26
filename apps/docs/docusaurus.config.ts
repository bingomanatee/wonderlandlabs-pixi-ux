import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const docsUrl = process.env.DOCS_URL ?? 'https://example.com';
const docsBaseUrlRaw = process.env.DOCS_BASE_URL ?? '/';
const docsBaseUrlWithLeadingSlash = docsBaseUrlRaw.startsWith('/')
  ? docsBaseUrlRaw
  : `/${docsBaseUrlRaw}`;
const docsBaseUrl = docsBaseUrlWithLeadingSlash.endsWith('/')
  ? docsBaseUrlWithLeadingSlash
  : `${docsBaseUrlWithLeadingSlash}/`;

const config: Config = {
  title: 'wonderlandlabs-pixi-ux',
  tagline: 'Monorepo docs for Pixi UX packages',
  favicon: 'img/logo.svg',

  // Set DOCS_URL and DOCS_BASE_URL in CI for deploy builds.
  url: docsUrl,
  baseUrl: docsBaseUrl,

  organizationName: 'wonderlandlabs',
  projectName: 'forestry-pixi',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: {
          showReadingTime: true,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    navbar: {
      title: 'Pixi UX Docs',
      logo: {
        alt: 'Pixi UX Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Docs',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [{label: 'Getting Started', to: '/intro'}],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} wonderlandlabs`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
