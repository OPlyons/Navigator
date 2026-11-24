export function linkGuideIndex(html) {
  return html
    .replace('data-nav="guides" href="#pg-heading"','data-nav="guides" href="/guides/"')
    .replace('<a href="#pg-heading">Practical guides <span aria-hidden="true">↓</span></a>','<a href="/guides/">Practical guides</a>');
}

export function renderMasthead(template, currentPage) {
  const start = template.indexOf('<svg xmlns="http://www.w3.org/2000/svg" class="sprite"');
  const end = template.indexOf('</header>', start);
  if (start < 0 || end < 0) throw new Error('Shared masthead missing');
  const navItem = 'data-nav="' + currentPage + '"';
  const header = linkGuideIndex(template.slice(start, end + '</header>'.length))
    .replace('class="nd-nav-link" href=', 'class="nd-nav-link" data-nav="neurodiversity" href=')
    .replace(/(<a\b[^>]*?\bhref=")(#[^"]+)/g, '$1/$2');
  if (!header.includes(navItem)) throw new Error('Missing navigation item for ' + currentPage);
  return header.replace(navItem, navItem + ' aria-current="page"');
}
