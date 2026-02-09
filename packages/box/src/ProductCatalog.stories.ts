import type { Meta, StoryObj } from '@storybook/html';
import { Application, Assets, Graphics, Sprite, Texture } from 'pixi.js';
import { BoxListStore } from './BoxListStore';
import { BoxLeafStore } from './BoxLeafStore';
import { BoxTextStore } from './BoxTextStore';
import { uniformPadding } from './types';

interface ProductCatalogArgs {
    cardWidth: number;
    cardHeight: number;
    gap: number;
}

const meta: Meta<ProductCatalogArgs> = {
    title: 'Box/ProductCatalog',
    argTypes: {
        cardWidth: { control: { type: 'range', min: 150, max: 300, step: 10 } },
        cardHeight: { control: { type: 'range', min: 200, max: 400, step: 10 } },
        gap: { control: { type: 'range', min: 0, max: 30, step: 2 } },
    },
    args: {
        cardWidth: 200,
        cardHeight: 280,
        gap: 16,
    },
};

export default meta;
type Story = StoryObj<ProductCatalogArgs>;

// Product data
const products = [
    { id: 'prod-1', name: 'Widget Pro', price: '$29.99' },
    { id: 'prod-2', name: 'Gadget X', price: '$49.99' },
    { id: 'prod-3', name: 'Super Tool', price: '$19.99' },
    { id: 'prod-4', name: 'Mega Device', price: '$99.99' },
    { id: 'prod-5', name: 'Mini Helper', price: '$9.99' },
    { id: 'prod-6', name: 'Power Unit', price: '$59.99' },
];

// Colors
const colors = {
    cardBg: { r: 0.15, g: 0.15, b: 0.2 },
    titleBarBg: { r: 0.2, g: 0.25, b: 0.35 },
    contentBg: { r: 0.12, g: 0.12, b: 0.15 },
    buttonBg: { r: 0.2, g: 0.5, b: 0.3 },
    buttonHover: { r: 0.25, g: 0.6, b: 0.35 },
    accent: { r: 0.4, g: 0.6, b: 0.9 },
    white: { r: 1, g: 1, b: 1 },
};

function createIcon(size: number, color: number): Graphics {
    const g = new Graphics();
    // Draw circle centered so bounds are (0,0,size,size)
    const radius = size / 2;
    g.circle(radius, radius, radius);
    g.fill(color);
    return g;
}

function createCloseX(size: number, color: number): Graphics {
    const g = new Graphics();
    // Draw X from (0,0) to (size,size) so bounds match logical size
    const inset = size * 0.25;
    g.moveTo(0, 0);
    g.lineTo(size, size);
    g.moveTo(size, 0);
    g.lineTo(0, size);
    g.stroke({ width: 2, color });
    return g;
}

function createProductCard(
    product: typeof products[0],
    app: Application,
    width: number,
    height: number,
    texture: Texture
): BoxListStore {
    // Main card container - vertical list
    const card = new BoxListStore({
        id: `card-${product.id}`,
        xDef: { size: width, align: 'start', sizeMode: 'px' },
        yDef: { size: height, align: 'start', sizeMode: 'px' },
        direction: 'vertical',
        gap: 0,
        style: {
            fill: { color: colors.cardBg, alpha: 1 },
            stroke: { color: colors.accent, alpha: 0.3, width: 1 },
            borderRadius: 8,
        },
    }, app);

    // Title bar - horizontal list: blue pip, green pip, title (fill), close X
    const titleBar = new BoxListStore({
        id: `titlebar-${product.id}`,
        xDef: { size: width, align: 'start', sizeMode: 'px' },
        yDef: { size: 36, align: 'start', sizeMode: 'px' },
        direction: 'horizontal',
        gap: 6,
        padding: { top: 6, right: 8, bottom: 6, left: 8 },
        style: { fill: { color: colors.titleBarBg, alpha: 1 }, borderRadius: 8 },
    }, app);

    // Blue pip (like macOS traffic light) - small circle centered in fill area
    const bluePip = new BoxLeafStore({
        id: `blue-pip-${product.id}`,
        xDef: { size: 8, align: 'center', sizeMode: 'px' },
        yDef: { align: 'center', sizeMode: 'fill' },
    }, app);
    bluePip.setContent(createIcon(8, 0x6699cc));

    // Green pip - small circle centered in fill area
    const greenPip = new BoxLeafStore({
        id: `green-pip-${product.id}`,
        xDef: { size: 8, align: 'center', sizeMode: 'px' },
        yDef: { align: 'center', sizeMode: 'fill' },
    }, app);
    greenPip.setContent(createIcon(8, 0x99cc66));

    // Title text (fill mode to take remaining space between pips and close button)
    const title = new BoxTextStore({
        id: `title-${product.id}`,
        text: product.name,
        xDef: { size: 0, align: 'center', sizeMode: 'fill' },
        yDef: { size: 24, align: 'center', sizeMode: 'px' },
        textStyle: { fontSize: 14, fill: 0xffffff, fontWeight: 'bold' },
    }, app);

    // Close X button - fill vertically so it centers within title bar
    const closeBtn = new BoxLeafStore({
        id: `close-${product.id}`,
        xDef: { size: 20, align: 'center', sizeMode: 'px' },
        yDef: { align: 'center', sizeMode: 'fill' },
        style: { fill: { color: { r: 0.5, g: 0.2, b: 0.2 }, alpha: 0.5 } }, // debug background
    }, app);
    closeBtn.setContent(createCloseX(20, 0xcc6666));

    titleBar.addChild(bluePip);
    titleBar.addChild(greenPip);
    titleBar.addChild(title);
    titleBar.addChild(closeBtn);

    // Content area - vertical list with image, price, button
    const contentArea = new BoxListStore({
        id: `content-${product.id}`,
        xDef: { size: width, align: 'center', sizeMode: 'px' },
        yDef: { size: height - 36, align: 'start', sizeMode: 'px' },
        direction: 'vertical',
        gap: 12,
        padding: uniformPadding(12),
        style: { fill: { color: colors.contentBg, alpha: 1 } },
    }, app);

    // Product image
    const imageBox = new BoxLeafStore({
        id: `image-${product.id}`,
        xDef: { size: width - 24, align: 'center', sizeMode: 'px' },
        yDef: { size: 120, align: 'center', sizeMode: 'px' },
        style: { fill: { color: { r: 0.2, g: 0.2, b: 0.25 }, alpha: 1 }, borderRadius: 4 },
    }, app);
    const sprite = new Sprite(texture);
    sprite.width = width - 40;
    sprite.height = 100;
    imageBox.setContent(sprite);

    // Price
    const price = new BoxTextStore({
        id: `price-${product.id}`,
        text: product.price,
        xDef: { size: 0, align: 'center', sizeMode: 'hug' },
        yDef: { size: 0, align: 'center', sizeMode: 'hug' },
        padding: { top: 4, right: 8, bottom: 4, left: 8 },
        textStyle: { fontSize: 20, fill: 0x66ff66, fontWeight: 'bold' },
    }, app);

    // Buy button
    const buyButton = new BoxTextStore({
        id: `buy-${product.id}`,
        text: 'Buy Now',
        xDef: { size: width - 48, align: 'center', sizeMode: 'px' },
        yDef: { size: 32, align: 'center', sizeMode: 'px' },
        padding: uniformPadding(6),
        style: { fill: { color: colors.buttonBg, alpha: 1 }, borderRadius: 4 },
        textStyle: { fontSize: 14, fill: 0xffffff, fontWeight: 'bold' },
    }, app);

    contentArea.addChild(imageBox);
    contentArea.addChild(price);
    contentArea.addChild(buyButton);

    card.addChild(titleBar);
    card.addChild(contentArea);

    return card;
}

export const Catalog: Story = {
    render: (args) => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '700px';
        wrapper.style.position = 'relative';

        const app = new Application();
        app.init({
            width: 800,
            height: 700,
            backgroundColor: 0x0a0a12,
            antialias: true,
        }).then(async () => {
            wrapper.appendChild(app.canvas);

            // Load placeholder texture
            let texture: Texture;
            try {
                texture = await Assets.load('/placeholder-art.png');
            } catch {
                // Fallback to generated texture
                const g = new Graphics();
                g.rect(0, 0, 160, 100);
                g.fill(0x334455);
                texture = app.renderer.generateTexture(g);
            }

            // Create grid container (3 columns x 2 rows)
            const gridContainer = new BoxListStore({
                id: 'grid-container',
                x: 40,
                y: 40,
                xDef: { size: 720, align: 'start', sizeMode: 'hug' },
                yDef: { size: 620, align: 'start', sizeMode: 'hug' },
                direction: 'vertical',
                gap: args.gap,
            }, app);

            // Create rows
            for (let row = 0; row < 2; row++) {
                const rowContainer = new BoxListStore({
                    id: `row-${row}`,
                    xDef: { size: 0, align: 'start', sizeMode: 'hug' },
                    yDef: { size: args.cardHeight, align: 'start', sizeMode: 'px' },
                    direction: 'horizontal',
                    gap: args.gap,
                }, app);

                for (let col = 0; col < 3; col++) {
                    const productIndex = row * 3 + col;
                    const product = products[productIndex];
                    const card = createProductCard(
                        product,
                        app,
                        args.cardWidth,
                        args.cardHeight,
                        texture
                    );
                    rowContainer.addChild(card);
                }

                gridContainer.addChild(rowContainer);
            }

            app.stage.addChild(gridContainer.container);
            gridContainer.markDirty();
        });

        return wrapper;
    },
};
