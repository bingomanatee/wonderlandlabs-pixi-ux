import type { StorybookConfig } from '@storybook/html-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../packages/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  docs: {
    autodocs: false,
  },
  staticDirs: ['./public'],
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      },
    });
  },
};

export default config;
