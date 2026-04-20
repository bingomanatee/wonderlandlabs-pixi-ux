import type { Meta, StoryObj } from '@storybook/html';
import { StyleTree } from './StyleTree.js';

interface StyleTreeArgs {
  example: string;
}

const meta: Meta<StyleTreeArgs> = {
  title: 'StyleTree/Examples',
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.fontFamily = 'monospace';
    wrapper.style.padding = '20px';
    wrapper.style.backgroundColor = '#f5f5f5';

    const title = document.createElement('h2');
    title.textContent = 'StyleTree Example';
    wrapper.appendChild(title);

    const description = document.createElement('p');
    description.textContent = 'Hierarchical style matching with noun paths and state-based selection';
    wrapper.appendChild(description);

    // Create style tree
    const tree = new StyleTree();

    // Add styles with different specificity levels
    tree.set('base.*.label.font', [], { color: '#666', size: 12 });
    tree.set('navigation.*.text.font', [], { color: '#333', size: 14 });
    tree.set('navigation.button.text.font', [], { color: '#000', size: 14 });
    tree.set('navigation.button.text.font', ['hover'], { color: '#0066cc', size: 14 });
    tree.set('navigation.button.text.font', ['disabled'], { color: '#999', size: 14 });
    tree.set('navigation.button.text.font', ['disabled', 'selected'], { color: '#666', size: 14 });
    tree.set('navigation.button.icon.font', ['*'], { color: '#444', size: 16 });
    tree.set('navigation.button.icon.font', ['hover'], { color: '#0066cc', size: 16 });

    // Test queries
    const queries = [
      { nouns: ['base', 'anything', 'label', 'font'], states: [] as string[], desc: 'Wildcard match' },
      { nouns: ['navigation', 'sidebar', 'text', 'font'], states: [] as string[], desc: 'Partial wildcard' },
      { nouns: ['navigation', 'button', 'text', 'font'], states: [] as string[], desc: 'Exact match (no state)' },
      { nouns: ['navigation', 'button', 'text', 'font'], states: ['hover'], desc: 'Exact match with state' },
      { nouns: ['navigation', 'button', 'text', 'font'], states: ['disabled', 'selected'], desc: 'Multi-state match' },
      { nouns: ['navigation', 'button', 'icon', 'font'], states: ['active'], desc: 'Base state match (*)' },
      { nouns: ['navigation', 'button', 'icon', 'font'], states: ['hover'], desc: 'Specific state beats base' },
    ];

    // Create results table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '20px';
    table.style.backgroundColor = 'white';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="background-color: #333; color: white;">
        <th style="padding: 10px; text-align: left;">Query</th>
        <th style="padding: 10px; text-align: left;">Description</th>
        <th style="padding: 10px; text-align: left;">Best Match</th>
        <th style="padding: 10px; text-align: left;">Score</th>
        <th style="padding: 10px; text-align: left;">Result</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    queries.forEach((query, index) => {
      const match = tree.findBestMatch({
        nouns: query.nouns,
        states: query.states,
      });

      const row = document.createElement('tr');
      row.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white';
      row.style.borderBottom = '1px solid #ddd';

      const queryStr = query.states.length > 0 ? `${query.nouns.join('.')}:${query.states.join('-')}` : query.nouns.join('.');
      
      row.innerHTML = `
        <td style="padding: 10px; font-weight: bold;">${queryStr}</td>
        <td style="padding: 10px;">${query.desc}</td>
        <td style="padding: 10px; color: #0066cc;">${match?.key || 'No match'}</td>
        <td style="padding: 10px;">${match?.score || '-'}</td>
        <td style="padding: 10px;">
          ${match ? `<span style="color: ${match.value.color}; font-size: ${match.value.size}px;">
            color: ${match.value.color}, size: ${match.value.size}
          </span>` : '-'}
        </td>
      `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);

    // Add scoring explanation
    const explanation = document.createElement('div');
    explanation.style.marginTop = '30px';
    explanation.style.padding = '15px';
    explanation.style.backgroundColor = 'white';
    explanation.style.border = '1px solid #ddd';
    explanation.innerHTML = `
      <h3>Scoring Algorithm</h3>
      <p><strong>Score = (matching nouns × 100) + matching states</strong></p>
      <ul>
        <li>Wildcards (*) in noun paths match anything but don't count toward score</li>
        <li>Base state (*) matches any state combination but doesn't count toward score</li>
        <li>Higher scores indicate more specific matches</li>
        <li>Example: <code>navigation.button.icon:disabled-selected</code> = 3 nouns × 100 + 2 states = 302 points</li>
      </ul>
    `;
    wrapper.appendChild(explanation);

    return wrapper;
  },
};

export default meta;
type Story = StoryObj<StyleTreeArgs>;

export const BasicExample: Story = {
  args: {
    example: 'basic',
  },
};

export const ComplexMatching: Story = {
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.fontFamily = 'monospace';
    wrapper.style.padding = '20px';

    const title = document.createElement('h2');
    title.textContent = 'Complex Matching Example';
    wrapper.appendChild(title);

    const tree = new StyleTree();

    // Add competing styles
    tree.set('navigation.button.icon', ['*'], 'Base state (score: 300)');
    tree.set('navigation.*.icon', ['hover'], 'Partial wildcard (score: 201)');
    tree.set('navigation.button.icon', ['hover'], 'Exact match (score: 301)');
    tree.set('navigation.button.icon', ['disabled', 'hover'], 'Multi-state (score: 302)');

    const query = { nouns: ['navigation', 'button', 'icon'], states: ['disabled', 'hover'] };
    const allMatches = tree.findAllMatches(query);

    const content = document.createElement('pre');
    content.style.backgroundColor = 'white';
    content.style.padding = '15px';
    content.style.border = '1px solid #ddd';
    content.textContent = `Query: ${query.nouns.join('.')}:${query.states.join('-')}\n\nAll Matches (sorted by score):\n${
      allMatches.map((m: { key: string; score: number; value: unknown }, i: number) =>
        `${i + 1}. ${m.key} (score: ${m.score}) → "${m.value}"`
      ).join('\n')
    }`;
    wrapper.appendChild(content);

    return wrapper;
  },
};

export const JSONDigestion: Story = {
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.fontFamily = 'monospace';
    wrapper.style.padding = '20px';
    wrapper.style.backgroundColor = '#f5f5f5';

    const title = document.createElement('h2');
    title.textContent = 'JSON Tree Digestion';
    wrapper.appendChild(title);

    const description = document.createElement('p');
    description.textContent = 'Plain keys form noun hierarchy, $-prefixed keys are states. You can use free functions or the StyleTree class helpers.';
    wrapper.appendChild(description);

    import('./digest.js').then(({ fromJSON }) => {
      const themeJSON = {
        button: {
          primary: {
            background: '#0066cc',
            color: '#ffffff',
            padding: '8px 16px',
            $hover: {
              background: '#0052a3',
            },
            $active: {
              background: '#003d7a',
            },
            $disabled: {
              background: '#cccccc',
              color: '#666666',
            },
          },
          secondary: {
            background: 'transparent',
            color: '#0066cc',
            border: '1px solid #0066cc',
            $hover: {
              background: '#f0f0f0',
            },
          },
        },
      };

      const tree = fromJSON(themeJSON);
      const classTree = StyleTree.fromJSON(themeJSON);
      const exportedJSON = classTree.toJSON();

      const apiSection = document.createElement('div');
      apiSection.style.marginTop = '20px';
      apiSection.innerHTML = '<h3>Class API:</h3>';
      const apiPre = document.createElement('pre');
      apiPre.style.backgroundColor = 'white';
      apiPre.style.padding = '15px';
      apiPre.style.border = '1px solid #ddd';
      apiPre.style.overflow = 'auto';
      apiPre.textContent = [
        "const tree = StyleTree.fromJSON(themeJSON);",
        "const json = tree.toJSON();",
        "",
        "const remoteTree = await StyleTree.fromJSONUrl('/theme.json');",
        "const customTree = await StyleTree.fromJSONUrl('https://example.com/theme.json', {",
        "  getJson: async (url) => myLoader(url),",
        "});",
      ].join('\n');
      apiSection.appendChild(apiPre);
      wrapper.appendChild(apiSection);

      // Show JSON input
      const jsonSection = document.createElement('div');
      jsonSection.style.marginTop = '20px';
      jsonSection.innerHTML = '<h3>Input JSON:</h3>';
      const jsonPre = document.createElement('pre');
      jsonPre.style.backgroundColor = 'white';
      jsonPre.style.padding = '15px';
      jsonPre.style.border = '1px solid #ddd';
      jsonPre.style.overflow = 'auto';
      jsonPre.textContent = JSON.stringify(themeJSON, null, 2);
      jsonSection.appendChild(jsonPre);
      wrapper.appendChild(jsonSection);

      // Show generated entries
      const entriesSection = document.createElement('div');
      entriesSection.style.marginTop = '20px';
      entriesSection.innerHTML = '<h3>Generated Style Entries:</h3>';
      const entriesPre = document.createElement('pre');
      entriesPre.style.backgroundColor = 'white';
      entriesPre.style.padding = '15px';
      entriesPre.style.border = '1px solid #ddd';
      entriesPre.style.overflow = 'auto';

      const entries = Array.from(tree.entries())
        .map(([key, value]: [string, unknown]) => `${key} → ${JSON.stringify(value)}`)
        .join('\n');
      entriesPre.textContent = entries;
      entriesSection.appendChild(entriesPre);
      wrapper.appendChild(entriesSection);

      const roundTripSection = document.createElement('div');
      roundTripSection.style.marginTop = '20px';
      roundTripSection.innerHTML = '<h3>Round-Tripped JSON:</h3>';
      const roundTripPre = document.createElement('pre');
      roundTripPre.style.backgroundColor = 'white';
      roundTripPre.style.padding = '15px';
      roundTripPre.style.border = '1px solid #ddd';
      roundTripPre.style.overflow = 'auto';
      roundTripPre.textContent = JSON.stringify(exportedJSON, null, 2);
      roundTripSection.appendChild(roundTripPre);
      wrapper.appendChild(roundTripSection);

      // Show example queries
      const queriesSection = document.createElement('div');
      queriesSection.style.marginTop = '20px';
      queriesSection.innerHTML = '<h3>Example Queries:</h3>';

      const queries = [
        { nouns: ['button', 'primary'], states: [] as string[], desc: 'Base primary button' },
        { nouns: ['button', 'primary'], states: ['hover'], desc: 'Primary button hover' },
        { nouns: ['button', 'primary'], states: ['disabled'], desc: 'Primary button disabled' },
        { nouns: ['button', 'secondary'], states: ['hover'], desc: 'Secondary button hover' },
      ];

      queries.forEach(query => {
        const result = tree.match(query);
        const queryDiv = document.createElement('div');
        queryDiv.style.backgroundColor = 'white';
        queryDiv.style.padding = '10px';
        queryDiv.style.marginTop = '10px';
        queryDiv.style.border = '1px solid #ddd';

        const queryStr = query.states.length > 0
          ? `${query.nouns.join('.')}:${query.states.join('-')}`
          : query.nouns.join('.');

        queryDiv.innerHTML = `
          <strong>${query.desc}</strong><br/>
          <code>${queryStr}</code><br/>
          <pre style="margin-top: 5px;">${JSON.stringify(result, null, 2)}</pre>
        `;
        queriesSection.appendChild(queryDiv);
      });

      wrapper.appendChild(queriesSection);
    });

    return wrapper;
  },
};
