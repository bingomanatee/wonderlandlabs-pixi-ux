# @wonderlandlabs-pixi-ux/button-simple

Direct PixiJS button runtime with explicit layout and lightweight child parts.

`button-simple` renders interactive PixiJS buttons from a small state object plus a `StyleTree`. It supports regular buttons, checkboxes, radios, hover/down/disabled visuals, icon and label children, image icons, gradients, and generated style presets.

## Install

```bash
npm install @wonderlandlabs-pixi-ux/button-simple pixi.js
```

`pixi.js` is a peer dependency. This package targets PixiJS `8.16.0` and Node `>=20`.

## Basic usage

```ts
import * as Pixi from 'pixi.js';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import {
  ButtonSimpleStore,
  makeButtonStyle,
} from '@wonderlandlabs-pixi-ux/button-simple';

PixiProvider.init(Pixi);

const app = new Pixi.Application();
await app.init({ backgroundColor: 0xf3eee2, antialias: true });
document.body.appendChild(app.canvas);

const button = new ButtonSimpleStore(
  {
    label: 'Launch Sequence',
    checked: true,
    callback: () => {
      console.log('clicked');
    },
  },
  {
    app,
    parentContainer: app.stage,
    pixi: PixiProvider.shared,
    simpleStyle: {
      baseColor: '#3d5165',
      textColor: '#eff8ff',
      fontSize: 14,
      padding: { x: 16, y: 8 },
      controlColor: '#9bbdff',
      controlSize: 12,
    },
    x: 40,
    y: 44,
  },
);

button.kickoff();
```

## Exports

```ts
import {
  ButtonSimpleStore,
  createButtonSimpleStoreClass,
  createButtonSimpleComparisonStyleTree,
  resolveButtonSimpleStyle,
  makeButtonStyle,
  snapButtonSimpleSize,

  CONTROL_BUTTON,
  CONTROL_CHECKBOX,
  CONTROL_RADIO,
  EVENT_CHECK_CHANGED,
  EVENT_RADIO_SELECTED,
  EVENT_RADIO_DESELECTED,
  ICON_BOX,
  ICON_CIRCLE,
  ICON_FILLED_BOX,
  ICON_FILLED_CIRCLE,
  ICON_IMAGE,
  ORIENTATION_HORIZONTAL,
  ORIENTATION_VERTICAL,
  PART_ICON,
  PART_LABEL,

  type ButtonSimpleState,
  type ButtonSimpleOptions,
  type ButtonSimpleOptionsWithStyle,
  type ButtonSimpleControlEvent,
  type MakeButtonStyleOptions,
} from '@wonderlandlabs-pixi-ux/button-simple';
```

## Core concepts

A button is made from three pieces:

1. **State** - the runtime button value: label, checked, disabled, control type, value, and callback.
2. **Style** - a `StyleTree` rooted at `button.simple` by default.
3. **Children** - lightweight label and icon parts arranged horizontally or vertically.

`ButtonSimpleStore` resolves style-tree values into a concrete layout and child list, then delegates rendering and pointer handling to `ButtonSimpleStoreBase`.

## Button state

```ts
type ButtonSimpleState = {
  id?: string;
  label?: string;
  buttonValue?: unknown;
  controlType?: 'button' | 'checkbox' | 'radio';
  disabled?: boolean;
  checked?: boolean;
  callback?: () => boolean | void;
};
```

Notes:

* `label` is used by label children with `useButtonLabel: true`.
* `checked` controls selected visuals for checkbox/radio icons.
* `disabled` disables pointer interaction and uses disabled styles.
* `callback` runs on click. If it returns a boolean, that value becomes the next `checked` state. Otherwise, checkboxes toggle and radios become checked.

## Constructor options

```ts
type ButtonSimpleOptionsWithStyle = {
  app: Pixi.Application;
  parentContainer: Pixi.Container;
  pixi?: PixiProvider;
  getCheckedValues?: () => unknown[];

  styleTree?: StyleTree;
  simpleStyle?: MakeButtonStyleOptions;
  root?: string;
  x?: number;
  y?: number;
};
```

Use `styleTree` for full control, or `simpleStyle` for a generated preset from `makeButtonStyle`. If neither is provided, the package default style tree is used.

## Generated styles with `makeButtonStyle`

`makeButtonStyle` creates a `StyleTree` using the default button style as a base.

```ts
const styleTree = makeButtonStyle({
  baseColor: ['#4a90e2', '#357abd'],
  textColor: '#ffffff',
  fontSize: 16,
  padding: { x: 20, y: 10 },
  controlColor: '#ffffff',
  controlSize: 14,
});
```

Options:

| Option         | Type     | Effect                                |                                       |            |                                                                            |
| -------------- | -------- | ------------------------------------- | ------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| `baseColor`    | `string  | number                                | (string                               | number)[]` | Sets the base background fill. Arrays create a gradient-style fill object. |
| `textColor`    | `string  | number`                               | Sets `button.simple.label.color`.     |            |                                                                            |
| `fontSize`     | `number` | Sets `button.simple.label.font.size`. |                                       |            |                                                                            |
| `padding`      | `number  | { x: number; y: number }`             | Sets horizontal and vertical padding. |            |                                                                            |
| `controlColor` | `string  | number`                               | Sets icon stroke/fill color.          |            |                                                                            |
| `controlSize`  | `number` | Sets icon width and height.           |                                       |            |                                                                            |

## StyleTree paths

The default root is `button.simple`. You can pass a custom `root` when constructing the button.

Common paths:

| Path                                         | Purpose                                           |
| -------------------------------------------- | ------------------------------------------------- |
| `button.simple.layout.orientation`           | `horizontal` or `vertical`.                       |
| `button.simple.layout.gap`                   | Space between child parts.                        |
| `button.simple.layout.padding.x` / `.y`      | Internal padding.                                 |
| `button.simple.layout.min.width` / `.height` | Minimum snapped button size.                      |
| `button.simple.layout.size.increment`        | Optional size snap increment.                     |
| `button.simple.layout.border.radius`         | Rounded background radius.                        |
| `button.simple.layout.border.width`          | Background border width.                          |
| `button.simple.layout.background.color`      | Background fill. Can be color or gradient object. |
| `button.simple.layout.border.color`          | Border color.                                     |
| `button.simple.label.color`                  | Label fill color.                                 |
| `button.simple.label.font.size`              | Label font size.                                  |
| `button.simple.label.font.family`            | Optional label font family.                       |
| `button.simple.icon.type`                    | Shape icon type.                                  |
| `button.simple.icon.checked.type`            | Shape icon when checked.                          |
| `button.simple.icon.width` / `.height`       | Icon size.                                        |
| `button.simple.icon.color`                   | Shape icon stroke color.                          |
| `button.simple.icon.fill.color`              | Shape icon fill color.                            |
| `button.simple.icon.alpha`                   | Icon alpha.                                       |
| `button.simple.children`                     | Explicit child part array.                        |

Visual state overrides use style-tree state arrays:

```ts
styleTree.set('button.simple.layout.background.color', [], '#3d5165');
styleTree.set('button.simple.layout.background.color', ['hovered'], '#4f6882');
styleTree.set('button.simple.layout.background.color', ['down'], '#354557');
styleTree.set('button.simple.layout.background.color', ['disabled'], '#9aa4ad');
```

Supported visual states are `active`, `hovered`, `down`, and `disabled`.

## Arbitrary child composition

`button-simple` does not assume a fixed icon + label structure. A button’s visible contents come from `button.simple.children`, an arbitrary ordered array of child part descriptors.

Each child can be either:

| Child type                    | Purpose                                                                   |
| ----------------------------- | ------------------------------------------------------------------------- |
| `PART_LABEL`                  | Renders text. It can use the button state label or provide its own label. |
| `PART_ICON` with `ICON_IMAGE` | Renders an image icon from a URL or asset path.                           |

The array order is the render order. This means a button can be text-only, icon-only, icon-label, label-icon, label-icon-label, multiple icons, multiple labels, or any other ordered composition that fits the layout.

```ts
styleTree.set('button.simple.children', [], [
  {
    type: PART_ICON,
    id: 'leading-icon',
    iconType: ICON_IMAGE,
    icon: '/icons/rocket.png',
    width: 18,
    height: 18,
  },
  {
    type: PART_LABEL,
    id: 'main-label',
    useButtonLabel: true,
  },
  {
    type: PART_LABEL,
    id: 'shortcut-label',
    text: '⌘K',
    labelStyle: {
      active: { color: '#cbd5e1', alpha: 0.8 },
      hovered: { color: '#ffffff', alpha: 1 },
      down: { color: '#ffffff', alpha: 0.7 },
      disabled: { color: '#94a3b8', alpha: 0.4 },
    },
  },
]);
```

### Label children

A label child may read from the button state or provide fixed text.

```ts
{
  type: PART_LABEL,
  id: 'label',
  useButtonLabel: true,
}
```

Use `useButtonLabel: true` when the text should come from `button.value.label`. Updating the button state label will then redraw the child.

```ts
button.updateState({ label: 'Updated label' });
```

Use `text` when the child should always render fixed text, such as a shortcut hint, badge, prefix, or suffix.

```ts
{
  type: PART_LABEL,
  id: 'badge',
  text: 'NEW',
}
```

Label children can also provide per-state text styles:

```ts
{
  type: PART_LABEL,
  id: 'label',
  useButtonLabel: true,
  labelStyle: {
    active: { color: '#ffffff' },
    hovered: { color: '#ffffff' },
    down: { color: '#cbd5e1' },
    disabled: { color: '#64748b' },
  },
}
```

### Image icon children

Image icons are also just children in the same array. Use `PART_ICON` with `ICON_IMAGE`.

```ts
{
  type: PART_ICON,
  id: 'star-icon',
  iconType: ICON_IMAGE,
  icon: '/icons/star.png',
  width: 16,
  height: 16,
}
```

Image icon children support per-state styling through `iconStyle`:

```ts
{
  type: PART_ICON,
  id: 'avatar-icon',
  iconType: ICON_IMAGE,
  icon: '/icons/user.png',
  width: 20,
  height: 20,
  iconStyle: {
    active: { alpha: 1 },
    hovered: { alpha: 1 },
    down: { alpha: 0.75 },
    disabled: { alpha: 0.35 },
  },
}
```

### Composition examples

Text-only:

```ts
styleTree.set('button.simple.children', [], [
  { type: PART_LABEL, id: 'label', useButtonLabel: true },
]);
```

Icon-only:

```ts
styleTree.set('button.simple.children', [], [
  {
    type: PART_ICON,
    id: 'icon',
    iconType: ICON_IMAGE,
    icon: '/icons/settings.png',
    width: 18,
    height: 18,
  },
]);
```

Label followed by icon:

```ts
styleTree.set('button.simple.children', [], [
  { type: PART_LABEL, id: 'label', useButtonLabel: true },
  {
    type: PART_ICON,
    id: 'trailing-icon',
    iconType: ICON_IMAGE,
    icon: '/icons/chevron-right.png',
    width: 12,
    height: 12,
  },
]);
```

Multiple labels and multiple icons:

```ts
styleTree.set('button.simple.children', [], [
  {
    type: PART_ICON,
    id: 'status-icon',
    iconType: ICON_IMAGE,
    icon: '/icons/check.png',
    width: 14,
    height: 14,
  },
  { type: PART_LABEL, id: 'label', useButtonLabel: true },
  { type: PART_LABEL, id: 'count', text: '12' },
  {
    type: PART_ICON,
    id: 'menu-icon',
    iconType: ICON_IMAGE,
    icon: '/icons/more.png',
    width: 14,
    height: 14,
  },
]);
```

The layout engine measures every child, applies `button.simple.layout.gap` between adjacent children, adds padding, snaps the button size, and centers the complete child group inside the background.

### How child data is consumed by the store

`ButtonSimpleStore` resolves `button.simple.children` from the style tree and passes the resulting child array into `ButtonSimpleStoreBase`.

`ButtonSimpleStoreBase` validates each child with `ButtonSimpleChildSchema`, creates a part store for each entry, and preserves the original child order:

```ts
this.#parts = children.map((child) => ({
  child,
  store: child.type === PART_LABEL
    ? new LabelPartStore(child, app, pixi, contentContainer)
    : new IconPartStore(child, app, pixi, contentContainer),
  width: 0,
  height: 0,
}));
```

On each resolve pass, label children receive text like this:

```ts
record.store.sync({
  text: child.useButtonLabel ? (this.value.label ?? '') : (child.text ?? ''),
  state: visualState,
});
```

So there are two label data paths:

| Label child config         | Runtime text source          |
| -------------------------- | ---------------------------- |
| `{ useButtonLabel: true }` | `button.value.label`         |
| `{ text: 'Fixed text' }`   | The child’s own `text` value |

Image icon children receive only visual state and checked state from the button:

```ts
record.store.sync({
  state: visualState,
  checked: this.value.checked,
});
```

The image URL itself comes from the child config inside `IconPartStore`:

```ts
function resolveImageIconUrl(config, checked) {
  if (checked) {
    return config.onIconUrl ?? config.icon;
  }
  return config.offIconUrl ?? config.icon;
}
```

That means image children support:

| Image field              | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `icon`                   | Default image URL or asset path.               |
| `onIconUrl`              | Optional image when the button is checked.     |
| `offIconUrl`             | Optional image when the button is unchecked.   |
| `width` / `height`       | Rendered sprite size and measured layout size. |
| `iconStyle[state].alpha` | Per-state image opacity.                       |

Example checked/unchecked image child:

```ts
{
  type: PART_ICON,
  id: 'power-state',
  iconType: ICON_IMAGE,
  icon: '/icons/power-neutral.png',
  onIconUrl: '/icons/power-on.png',
  offIconUrl: '/icons/power-off.png',
  width: 18,
  height: 18,
  iconStyle: {
    active: { alpha: 1 },
    hovered: { alpha: 1 },
    down: { alpha: 0.75 },
    disabled: { alpha: 0.35 },
  },
}
```

## Gradients

Background fills can be plain colors or gradient objects.

```ts
styleTree.set('button.simple.layout.background.color', [], {
  direction: 'vertical',
  colors: ['#4a90e2', '#357abd'],
});

styleTree.set('button.simple.layout.background.color', ['hovered'], {
  direction: 'vertical',
  colors: ['#5da1f3', '#4a90e2'],
});
```

`direction` may be `horizontal` or `vertical`. Color stops can be supplied as simple colors or `{ offset, color }` objects.

## Horizontal and vertical layouts

```ts
styleTree.set('button.simple.layout.orientation', [], ORIENTATION_VERTICAL);
styleTree.set('button.simple.layout.gap', [], 6);
styleTree.set('button.simple.layout.padding.x', [], 10);
styleTree.set('button.simple.layout.padding.y', [], 10);
styleTree.set('button.simple.layout.min.width', [], 88);
styleTree.set('button.simple.layout.min.height', [], 96);
```

The runtime measures every child, adds gaps and padding, snaps the result with `sizeIncrement`, centers the content, then redraws the active background.

## Checkbox and radio controls

Use `controlType` to opt into checkbox or radio behavior.

```ts
const checkbox = new ButtonSimpleStore(
  {
    id: 'check-alerts',
    label: 'alerts',
    buttonValue: 'alerts',
    controlType: CONTROL_CHECKBOX,
    checked: true,
  },
  {
    app,
    parentContainer: app.stage,
    pixi,
    styleTree,
    getCheckedValues: () => checkboxes
      .filter((button) => button.value.checked)
      .map((button) => button.value.buttonValue),
  },
);
```

For radios, listen for `EVENT_RADIO_SELECTED` and deselect sibling buttons:

```ts
const radioButtons: ButtonSimpleStore[] = [];

app.stage.on(EVENT_RADIO_SELECTED, (event: { id?: string }) => {
  radioButtons.forEach((button) => button.onRadioDeselected({ id: event.id }));
});
```

For checkbox groups, listen for `EVENT_CHECK_CHANGED`:

```ts
app.stage.on(EVENT_CHECK_CHANGED, (event: ButtonSimpleControlEvent) => {
  console.log(event.changedButtonValue, event.checkedValues);
});
```

Events are emitted on the button container and its parent container.

## Bound button classes

Use `createButtonSimpleStoreClass` when several buttons share the same style tree and root.

```ts
const styleTree = makeButtonStyle({
  baseColor: '#65513d',
  textColor: '#fff8ef',
});

const WarmButton = createButtonSimpleStoreClass(styleTree);

const save = new WarmButton(
  { label: 'Save' },
  { app, parentContainer: app.stage, pixi },
);

save.setPosition(40, 44);
save.kickoff();
```

## Updating state

```ts
button.updateState({ label: 'Proceed To Checkout' });
button.updateState({ label: 'Done', disabled: true });
button.checked = true;
button.setPosition(120, 80);
button.click();
```

Useful runtime methods and properties:

| API                         | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| `kickoff()`                 | Starts the store and performs initial render.         |
| `updateState(next)`         | Merges and validates partial state.                   |
| `setPosition(x, y)`         | Moves the root container.                             |
| `click()`                   | Runs click behavior programmatically.                 |
| `checked`                   | Getter/setter for checked state.                      |
| `onRadioDeselected({ id })` | Deselects radios whose id does not match the payload. |
| `cleanup()`                 | Cleans up child part stores and base store resources. |

## Lower-level API

`resolveButtonSimpleStyle(styleTree, root, state)` returns the concrete `layout` and `children` that will be passed to `ButtonSimpleStoreBase`.

```ts
const { layout, children } = resolveButtonSimpleStyle(styleTree, 'button.simple', {
  controlType: CONTROL_CHECKBOX,
});
```

`createButtonSimpleComparisonStyleTree()` returns the package default style tree from `defaultStyles.json`.

`snapButtonSimpleSize(value, increment)` rounds button dimensions up to the nearest increment.

## Storybook coverage

The package stories demonstrate:

* custom child arrangements: no icon, label-first, label-icon-label;
* gradient backgrounds;
* image icon children;
* horizontal and vertical layouts;
* dynamic label growth and disabled state updates;
* checkbox and radio events;
* press/down visual state;
* a 100-button style-tree grid;
* `makeButtonStyle` controls for color, type size, and padding.

## Development

```bash
npm run build
npm test
npm run test:watch
```

## Package metadata

* Main entry: `dist/index.js`
* Types: `dist/index.d.ts`
* Module type: ESM
* Peer dependency: `pixi.js@8.16.0`
