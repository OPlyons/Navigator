(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const byId = id => document.getElementById(id);
  const search = byId('nd-search');
  const filter = byId('nd-topic');
  const fold = text => text.normalize('NFKD').replace(/\p{Mark}/gu, '').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim();
  const topics = [...document.querySelectorAll('.nd-topic')].map(element => {
    const heading = element.querySelector('summary span').textContent;
    const context = fold(heading + ' ' + element.querySelector('.nd-topic-description').textContent);
    const entries = [...element.querySelectorAll('.nd-entry')].map(node => ({node, text:context + ' ' + fold(node.textContent)}));
    return {element, count:element.querySelector('summary small'), entries};
  });
  const groups = [...document.querySelectorAll('.nd-group')];
  let previousOpen = null;
  function applyFilters() {
    const words = fold(search.value).split(' ').filter(Boolean);
    const filtering = words.length > 0 || !!filter.value;
    if (filtering && previousOpen === null) previousOpen = new Set(topics.filter(t => t.element.open).map(t => t.element.id));
    const visibleCards = new Set();
    let topicCount = 0;
    for (const {element, count, entries} of topics) {
      const matchesTopic = !filter.value || element.id === 'topic-' + filter.value;
      let found = 0;
      for (const {node, text} of entries) {
        const visible = matchesTopic && words.every(word => text.includes(word));
        node.hidden = !visible;
        if (visible) { found++; visibleCards.add(node.dataset.card); }
      }
      count.textContent = String(found);
      element.hidden = found === 0;
      if (filtering) element.open = !!found;
      else if (previousOpen) element.open = previousOpen.has(element.id);
      if (found) topicCount++;
    }
    if (!filtering) previousOpen = null;
    for (const group of groups) group.hidden = !group.querySelector('.nd-topic:not([hidden])');
    const count = visibleCards.size;
    byId('nd-count').textContent = `${count} ${count === 1 ? 'resource' : 'resources'} · ${topicCount} ${topicCount === 1 ? 'topic' : 'topics'}`;
    byId('nd-empty').hidden = count > 0;
  }
  byId('nd-tools').hidden = false;
  search.addEventListener('input', applyFilters);
  filter.addEventListener('change', applyFilters);
  byId('nd-clear').addEventListener('click', () => { search.value = ''; filter.value = ''; applyFilters(); search.focus(); });
  function openLinkedTopic() {
    const topic = topics.find(t => '#' + t.element.id === location.hash);
    if (topic) { topic.element.open = true; topic.element.scrollIntoView(); }
  }
  window.addEventListener('hashchange', openLinkedTopic);
  openLinkedTopic();
  let beforePrint;
  window.addEventListener('beforeprint', () => {
    if (beforePrint) return;
    beforePrint = topics.filter(t => t.element.open);
    for (const topic of topics) if (!topic.element.hidden) topic.element.open = true;
  });
  window.addEventListener('afterprint', () => {
    if (!beforePrint) return;
    for (const topic of topics) topic.element.open = beforePrint.includes(topic);
    beforePrint = null;
  });
})();
