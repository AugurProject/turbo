module.exports = {
  title: 'Augur Docs',
  tagline: 'Augur Documentation',
  url: 'https://www.augur.sh',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'augurproject', // Usually your GitHub org/user name.
  projectName: 'turbo', // Usually your repo name.
  stylesheets: [
  ],
  themeConfig: {
    navbar: {
      title: 'Augur Docs',
      logo: {
        alt: 'Augur',
        src: 'img/augur-logo/Glyph/Color.svg',
        srcDark: 'img/augur-logo/Glyph/White.svg',
      },
      items: [
        {
          to: 'docs/',
          activeBasePath: 'docs',
          label: 'Overview',
          position: 'left',
        },
        {
          href: 'https://github.com/AugurProject/turbo',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Forecast Foundation OU. Built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          path: 'docs',
          // Docs-only mode
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/AugurProject/turbo/edit/dev/augur.sh/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
