import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BoxAlign, RectPartialType, RectPXType } from '../src/types.js';

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'artifacts');

type RenderComputeAxisSvgInput = {
    name: string;
    parent: RectPXType;
    align: BoxAlign['_type'];
    dims: RectPartialType[];
    locations: RectPXType[];
};

const SCALE = 2;

function escapeXml(input: string): string {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function slugify(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function renderComputeAxisSvg({
    name,
    parent,
    align,
    dims,
    locations,
}: RenderComputeAxisSvgInput): string {
    mkdirSync(OUTPUT_DIR, { recursive: true });

    const diagramPadding = 24;
    const titleHeight = 28;
    const diagramWidth = parent.x + parent.w + diagramPadding * 2;
    const diagramHeight = parent.y + parent.h + diagramPadding * 2 + titleHeight;
    const estimatedTitleWidth = 48 + name.length * 11;
    const svgWidth = Math.max(diagramWidth, estimatedTitleWidth);
    const svgHeight = diagramHeight;
    const scaledWidth = svgWidth * SCALE;
    const scaledHeight = svgHeight * SCALE;

    const childRects = locations.map((location, index) => {
        const fill = ['#d6e4ff', '#fde2e4', '#d8f3dc', '#fff1c1'][index % 4];
        const labelY = location.y + titleHeight + 18;
        return [
            `<rect x="${location.x}" y="${location.y + titleHeight}" width="${location.w}" height="${location.h}" fill="${fill}" stroke="#2f3e46" stroke-width="1.5" rx="4" />`,
            `<text x="${location.x + 8}" y="${labelY}" font-family="monospace" font-size="12" fill="#1b263b">#${index}</text>`,
        ].join('');
    }).join('');

    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${scaledWidth}" height="${scaledHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`,
        `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#f8f9fa" />`,
        `<text x="24" y="18" font-family="monospace" font-size="16" fill="#0b132b" dominant-baseline="ideographic">${escapeXml(name)}</text>`,
        `<rect x="${parent.x}" y="${parent.y + titleHeight}" width="${parent.w}" height="${parent.h}" fill="#ffffff" stroke="#0b132b" stroke-width="2" rx="6" />`,
        childRects,
        `</svg>`,
    ].join('');

    const outputPath = join(OUTPUT_DIR, `${slugify(name)}.svg`);
    writeFileSync(outputPath, svg, 'utf8');
    return outputPath;
}
