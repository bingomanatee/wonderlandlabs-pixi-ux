# @wonderlandlabs-pixi-ux/button

Composable button store built on `@wonderlandlabs-pixi-ux/box` and styled through `@wonderlandlabs-pixi-ux/style-tree`.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/button @wonderlandlabs-pixi-ux/style-tree
```

## Basic Usage

```ts
import { Application, Sprite, Assets } from 'pixi.js';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import { ButtonStore } from '@wonderlandlabs-pixi-ux/button';

const app = new Application();
await app.init({ width: 800, height: 600 });

const styleTree = fromJSON({
  button: {
    inline: {
      padding: { $*: { x: 12, y: 6 } },
      borderRadius: { $*: 6 },
      iconGap: { $*: 8 },
      fill: {
        $*: { color: { r: 0.2, g: 0.55, b: 0.85 }, alpha: 1 },
        $hover: { color: { r: 0.25, g: 0.62, b: 0.9 }, alpha: 1 }
      },
      label: {
        fontSize: { $*: 14 },
        color: { $*: { r: 1, g: 1, b: 1 } },
        alpha: { $*: 1 }
      }
    }
  }
});

const texture = await Assets.load('/placeholder-art.png');
const button = new ButtonStore({
  id: 'save',
  mode: 'inline',
  sprite: new Sprite(texture),
  label: 'Save',
  onClick: () => console.log('clicked'),
}, styleTree, app);

button.setPosition(120, 120);
app.stage.addChild(button.container);
button.kickoff();
```

## Button Config

```ts
{
  id: string,
  mode?: 'icon' | 'iconVertical' | 'text' | 'inline',
  sprite?: Sprite,
  icon?: Container,
  rightSprite?: Sprite,
  rightIcon?: Container,
  label?: string,
  isDisabled?: boolean,
  onClick?: () => void,
  variant?: string,
  bitmapFont?: string,
}
```

Mode behavior:
- `icon`: icon-only.
- `iconVertical`: icon with label below.
- `text`: label-only.
- `inline`: icon + label in a row (optionally right icon too).

If `mode` is omitted it is inferred from available icon/label fields.

## StyleTree Expectations

State keys are read using noun paths under `button` and optional states (`hover`, `disabled`).

Common keys:
- `button.padding.x`, `button.padding.y`
- `button.borderRadius`
- `button.fill.color`, `button.fill.alpha`
- `button.stroke.color`, `button.stroke.width`, `button.stroke.alpha`
- `button.label.fontSize`, `button.label.color`, `button.label.alpha`
- `button.icon.size.x`, `button.icon.size.y`, `button.icon.alpha`
- Mode-specific variants: `button.inline.*`, `button.text.*`, `button.iconVertical.*`

Variant lookup inserts `variant` after `button` (for example `button.primary.inline.fill.color`).

## Main API

- `setHovered(isHovered)`
- `setDisabled(isDisabled)`
- `isHovered`
- `isDisabled`
- `mode`
- `getConfig()`
- `getPreferredSize()`
