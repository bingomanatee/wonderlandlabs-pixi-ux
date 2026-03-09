import type { Preview } from '@storybook/html';

if (typeof window !== 'undefined') {
  (window as typeof window & {
    __PIXI_WINDOW_DRAG_DEBUG__?: boolean;
    __PIXI_RESIZER_DEBUG__?: boolean;
  }).__PIXI_WINDOW_DRAG_DEBUG__ = true;
  (window as typeof window & {
    __PIXI_WINDOW_DRAG_DEBUG__?: boolean;
    __PIXI_RESIZER_DEBUG__?: boolean;
  }).__PIXI_RESIZER_DEBUG__ = true;

  const url = new URL(window.location.href);
  const path = url.searchParams.get('path');
  if (path?.startsWith('/docs/')) {
    url.searchParams.set('path', path.replace('/docs/', '/story/'));
    window.history.replaceState({}, '', url.toString());
  } else if (url.searchParams.get('viewMode') === 'docs') {
    url.searchParams.set('viewMode', 'story');
    window.history.replaceState({}, '', url.toString());
  }
}

const preview: Preview = {
  parameters: {
    onboarding: {
      disable: true
    },
    docs: {
      disable: true,
      renderer: (() => null) as any,
    },
    previewTabs: {
      'storybook/docs/panel': {
        hidden: true,
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
