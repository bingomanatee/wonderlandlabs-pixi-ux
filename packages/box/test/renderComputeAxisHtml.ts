import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BoxAlign, RectPartialType, RectPXType } from '../src/types.js';

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'artifacts');

type RenderComputeAxisHtmlInput = {
    name: string;
    svgPath: string;
    parent: RectPXType;
    align: BoxAlign['_type'];
    dims: RectPartialType[];
    locations: RectPXType[];
};

function escapeHtml(input: string): string {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function slugify(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function valueCell(value: unknown): string {
    return `<code>${escapeHtml(JSON.stringify(value))}</code>`;
}

export function renderComputeAxisHtml({
    name,
    svgPath,
    parent,
    align,
    dims,
    locations,
}: RenderComputeAxisHtmlInput): string {
    mkdirSync(OUTPUT_DIR, { recursive: true });

    const dimRows = dims.map((dim, index) => `
        <tr>
            <td>${index}</td>
            <td>${valueCell(dim.w)}</td>
            <td>${valueCell(dim.h)}</td>
            <td>${valueCell(dim)}</td>
        </tr>
    `).join('');

    const locationRows = locations.map((location, index) => `
        <tr>
            <td>${index}</td>
            <td>${location.x}</td>
            <td>${location.y}</td>
            <td>${location.w}</td>
            <td>${location.h}</td>
        </tr>
    `).join('');

    const html = `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(name)}</title>
    <style>
        :root {
            color-scheme: light;
            --bg: #f8f9fa;
            --panel: #ffffff;
            --line: #cbd5e1;
            --text: #14213d;
            --muted: #52606d;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 24px;
            background: var(--bg);
            color: var(--text);
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        h1, h2 {
            margin: 0 0 12px;
            font-weight: 600;
        }

        .layout {
            display: grid;
            grid-template-columns: minmax(360px, 720px) minmax(420px, 1fr);
            gap: 24px;
            align-items: start;
        }

        .panel {
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 16px;
        }

        .summary {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 8px 12px;
            margin-bottom: 20px;
        }

        .summary dt {
            color: var(--muted);
        }

        .summary dd {
            margin: 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
        }

        th, td {
            border: 1px solid var(--line);
            text-align: left;
            padding: 8px;
            vertical-align: top;
        }

        th {
            background: #eef2f7;
        }

        img {
            display: block;
            width: 100%;
            height: auto;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: #fff;
        }

        code {
            white-space: pre-wrap;
            word-break: break-word;
        }
    </style>
</head>
<body>
    <div class="layout">
        <section class="panel">
            <h1>${escapeHtml(name)}</h1>
            <img src="./${escapeHtml(svgPath.split('/').pop() ?? '')}" alt="${escapeHtml(name)} diagram" />
        </section>
        <section class="panel">
            <h2>Scenario</h2>
            <dl class="summary">
                <dt>Parent</dt>
                <dd>${valueCell(parent)}</dd>
                <dt>Align</dt>
                <dd>${valueCell(align)}</dd>
            </dl>

            <h2>Configured Dims</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>w</th>
                        <th>h</th>
                        <th>raw</th>
                    </tr>
                </thead>
                <tbody>${dimRows}</tbody>
            </table>

            <h2>Computed Rects</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>x</th>
                        <th>y</th>
                        <th>w</th>
                        <th>h</th>
                    </tr>
                </thead>
                <tbody>${locationRows}</tbody>
            </table>
        </section>
    </div>
</body>
</html>`;

    const outputPath = join(OUTPUT_DIR, `${slugify(name)}.html`);
    writeFileSync(outputPath, html, 'utf8');
    return outputPath;
}
