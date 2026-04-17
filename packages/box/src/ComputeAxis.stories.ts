import type { Meta, StoryObj } from '@storybook/html';
import { ComputeAxis } from './ComputeAxis.js';
import {
    DIR_HORIZ,
    DIR_VERT,
    POS_CENTER,
    POS_END,
    POS_FILL,
    POS_START,
    SIZE_FRACTION,
    SIZE_PCT,
} from './constants.js';
import type { BoxAlignType, RectPXType, RectPartialType } from './types.js';

type ComputeAxisScenario = {
    name: string;
    align: BoxAlignType;
    dims: RectPartialType[];
};

const parent: RectPXType = { x: 10, y: 20, w: 300, h: 120 };

const scenarios: ComputeAxisScenario[] = [
    {
        name: 'Stacks Horizontal Children From The Start By Default',
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
        dims: [
            { w: 50, h: 20 },
            { w: 100, h: 30 },
        ],
    },
    {
        name: 'Aligns The Run On The Main Axis And Children On The Cross Axis',
        align: { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_END },
        dims: [
            { w: 50, h: 20 },
            { w: 100, h: 30 },
        ],
    },
    {
        name: 'Resolves Width And Height Against Their Own Parent Dimensions',
        align: { direction: DIR_VERT, xPosition: POS_START, yPosition: POS_START },
        dims: [
            {
                w: { value: 50, unit: SIZE_PCT },
                h: { value: 25, unit: SIZE_PCT },
            },
        ],
    },
    {
        name: 'Stacks Vertical Children And Centers Them On The Cross Axis',
        align: { direction: DIR_VERT, xPosition: POS_CENTER, yPosition: POS_START },
        dims: [
            { w: 60, h: 20 },
            { w: 100, h: 30 },
        ],
    },
    {
        name: 'Uses The Largest Resolved Peer Span For Cross-Axis Fractional Sizes',
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
        dims: [
            { w: 50, h: 20 },
            { w: 60, h: { value: 1, unit: SIZE_FRACTION } },
            { w: 70, h: 30 },
        ],
    },
    {
        name: 'Distributes Main-Axis Fractional Spans By Weight From The Remainder',
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
        dims: [
            { w: 60, h: 20 },
            { w: { value: 1, unit: SIZE_FRACTION }, h: 20 },
            { w: { value: 2, unit: SIZE_FRACTION }, h: 20 },
        ],
    },
    {
        name: 'Fills The Parent Cross Span When Cross-Axis Alignment Is Fill',
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_FILL },
        dims: [
            { w: 50, h: 20 },
            { w: 100, h: { value: 1, unit: SIZE_FRACTION } },
        ],
    },
    {
        name: 'Treats Main-Axis Fill As Centered When There Are No Fractional Spans',
        align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_START },
        dims: [
            { w: 50, h: 20 },
            { w: 100, h: 20 },
        ],
    },
    {
        name: 'Treats Main-Axis Fill As Start-Aligned When Fractional Spans Are Present',
        align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_START },
        dims: [
            { w: 60, h: 20 },
            { w: { value: 1, unit: SIZE_FRACTION }, h: 20 },
        ],
    },
];

const meta: Meta = {
    title: 'Box/ComputeAxis',
};

export default meta;
type Story = StoryObj;

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function valueCell(value: unknown): string {
    return `<code>${escapeHtml(JSON.stringify(value))}</code>`;
}

function computeScenario(scenario: ComputeAxisScenario): RectPXType[] {
    return new ComputeAxis(scenario.align, parent, scenario.dims).compute();
}

function renderScenarioSvg(locations: RectPXType[], name: string): string {
    const titleHeight = 28;
    const padding = 24;
    const diagramWidth = Math.max(parent.x + parent.w + padding * 2, 48 + name.length * 11);
    const diagramHeight = parent.y + parent.h + padding * 2 + titleHeight;
    const childRects = locations.map((location, index) => {
        const fill = ['#d6e4ff', '#fde2e4', '#d8f3dc', '#fff1c1'][index % 4];
        return [
            `<rect x="${location.x}" y="${location.y + titleHeight}" width="${location.w}" height="${location.h}" fill="${fill}" stroke="#2f3e46" stroke-width="1.5" rx="4" />`,
            `<text x="${location.x + 8}" y="${location.y + titleHeight + 18}" font-family="monospace" font-size="12" fill="#1b263b">#${index}</text>`,
        ].join('');
    }).join('');

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${diagramWidth}" height="${diagramHeight}" viewBox="0 0 ${diagramWidth} ${diagramHeight}">`,
        `<rect x="0" y="0" width="${diagramWidth}" height="${diagramHeight}" fill="#f8f9fa" />`,
        `<text x="24" y="18" font-family="monospace" font-size="16" fill="#0b132b" dominant-baseline="ideographic">${escapeHtml(name)}</text>`,
        `<rect x="${parent.x}" y="${parent.y + titleHeight}" width="${parent.w}" height="${parent.h}" fill="#ffffff" stroke="#0b132b" stroke-width="2" rx="6" />`,
        childRects,
        `</svg>`,
    ].join('');
}

function renderScenarioMarkup(scenario: ComputeAxisScenario): string {
    const locations = computeScenario(scenario);
    const dimRows = scenario.dims.map((dim, index) => `
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

    return `
        <div class="scenario-layout">
            <section class="panel">
                ${renderScenarioSvg(locations, scenario.name)}
            </section>
            <section class="panel">
                <h2>Scenario</h2>
                <dl class="summary">
                    <dt>Parent</dt>
                    <dd>${valueCell(parent)}</dd>
                    <dt>Align</dt>
                    <dd>${valueCell(scenario.align)}</dd>
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
    `;
}

function renderScenarioStory(scenario: ComputeAxisScenario): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <style>
            :root {
                color-scheme: light;
                --bg: #f5f7fb;
                --panel: #ffffff;
                --line: #d8dee9;
                --text: #1f2937;
                --muted: #667085;
            }

            .scenario-story {
                min-height: 100vh;
                padding: 12px;
                background: var(--bg);
                color: var(--text);
                font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .scenario-layout {
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

            code {
                white-space: pre-wrap;
                word-break: break-word;
            }

            svg {
                display: block;
                width: 100%;
                height: auto;
                border: 1px solid var(--line);
                border-radius: 8px;
                background: #fff;
            }
        </style>
        <div class="scenario-story">
            ${renderScenarioMarkup(scenario)}
        </div>
    `;
    return wrapper;
}

function scenarioStory(scenario: ComputeAxisScenario): Story {
    return {
        name: scenario.name,
        render: () => renderScenarioStory(scenario),
    };
}

export const StacksHorizontalChildrenFromTheStartByDefault = scenarioStory(scenarios[0]);
export const AlignsTheRunOnTheMainAxisAndChildrenOnTheCrossAxis = scenarioStory(scenarios[1]);
export const ResolvesWidthAndHeightAgainstTheirOwnParentDimensions = scenarioStory(scenarios[2]);
export const StacksVerticalChildrenAndCentersThemOnTheCrossAxis = scenarioStory(scenarios[3]);
export const UsesTheLargestResolvedPeerSpanForCrossAxisFractionalSizes = scenarioStory(scenarios[4]);
export const DistributesMainAxisFractionalSpansByWeightFromTheRemainder = scenarioStory(scenarios[5]);
export const FillsTheParentCrossSpanWhenCrossAxisAlignmentIsFill = scenarioStory(scenarios[6]);
export const TreatsMainAxisFillAsCenteredWhenThereAreNoFractionalSpans = scenarioStory(scenarios[7]);
export const TreatsMainAxisFillAsStartAlignedWhenFractionalSpansArePresent = scenarioStory(scenarios[8]);
