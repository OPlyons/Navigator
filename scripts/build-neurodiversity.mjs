import fs from 'node:fs/promises';
import path from 'node:path';
import {renderMasthead} from './render-masthead.mjs';

const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function resourceLink(link) {
  const url = new URL(link.url);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Invalid neurodiversity resource URL');
  }
  return `<a href="${escape(url.href)}" rel="noreferrer">${escape(link.label)}</a>`;
}

function renderEntry(entry, topicId) {
  const links = entry.links.map(resourceLink);
  const sources = entry.sources.filter(source => source.topic === topicId);
  for (const [index, source] of sources.entries()) {
    const label = index > 0 ? 'Related board entry' : (links.length ? 'Board entry' : 'Read the board entry');
    links.push(`<a class="nd-source" href="https://trello.com/c/${source.card}" rel="noreferrer" aria-label="${label} for ${escape(entry.title)}">${label}</a>`);
  }
  return `<li class="nd-entry" data-card="${entry.sources[0].card}">
    <h4>${escape(entry.title)}</h4>
    ${entry.description ? `<p>${escape(entry.description)}</p>` : ''}
    ${entry.note ? `<p class="nd-entry-note">${escape(entry.note)}</p>` : ''}
    <div class="nd-entry-links">${links.join(' ')}</div>
  </li>`;
}

function renderTopic(topic) {
  if (!/^[a-z0-9-]+$/.test(topic.id) || !topic.entries.length) throw new Error('Invalid neurodiversity topic');
  return `<details class="nd-topic" id="topic-${topic.id}">
    <summary><span>${escape(topic.title)}</span><small>${topic.entries.length}</small></summary>
    <p class="nd-topic-description">${escape(topic.description)}</p>
    <ul class="nd-entries">${topic.entries.map(entry => renderEntry(entry, topic.id)).join('\n')}</ul>
  </details>`;
}

export async function buildNeurodiversity({root, out, template}) {
  const read = file => fs.readFile(path.join(root, file), 'utf8');
  const data = JSON.parse(await read('data/neurodiversity.json'));
  const topics = data.groups.flatMap(group => group.topics);
  const topicIds = new Set(topics.map(topic => topic.id));
  const sources = data.resources.flatMap(resource => resource.sources);
  const cards = sources.map(source => source.card);
  if (new Set(cards).size !== cards.length || topicIds.size !== topics.length ||
      sources.some(s => !topicIds.has(s.topic) || !/^[a-zA-Z0-9]{8}$/.test(s.card)) ||
      data.resources.some(r => !r.sources.length || !r.title.trim())) throw new Error('Invalid board source or topic');
  for (const topic of topics) topic.entries = data.resources.filter(r => r.sources.some(s => s.topic === topic.id));
  const choices = data.groups.map(group =>
    `<optgroup label="${escape(group.title)}">${group.topics.map(topic =>
      `<option value="${topic.id}">${escape(topic.title)}</option>`).join('')}</optgroup>`
  ).join('\n');
  const groups = data.groups.map(group => `<section class="nd-group">
    <h3>${escape(group.title)}</h3><div class="nd-topic-grid">${group.topics.map(renderTopic).join('\n')}</div>
  </section>`).join('\n');
  const masthead = renderMasthead(template, 'neurodiversity');
  let page = await read('site/neurodiversity.html');
  for (const [slot, content] of Object.entries({
    'shared masthead': masthead, 'collection count': `${data.resources.length} resources across ${topics.length} topics`,
    'topic options': choices, 'topic sections': groups,
    'collection date': new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'}).format(new Date(data.source.checkedOn + 'T12:00:00Z'))
  })) {
    const marker = `<!-- ${slot} -->`;
    if (!page.includes(marker)) throw new Error('Missing neurodiversity template slot: ' + slot);
    page = page.replace(marker, () => content);
  }
  const folder = path.join(out, 'neurodiversity');
  await fs.mkdir(folder, {recursive:true});
  await fs.writeFile(path.join(folder, 'index.html'), page);
  const css = await read('site/community-design.css') + '\n' + await read('site/neurodiversity.css');
  await fs.writeFile(path.join(out, 'assets/neurodiversity.css'), css);
  for (const file of ['reading-navigation.js', 'neurodiversity.js']) {
    await fs.copyFile(path.join(root, 'site', file), path.join(out, 'assets', file));
  }
}
