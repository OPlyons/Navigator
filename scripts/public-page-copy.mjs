// Update the shared public pages before the guide and directory markup is emitted.
export function editPublicPageCopy(template) {
  return template
    .replace('<meta name="theme-color" content="#075e54">', '')
    .replace('<p class="crisis-eyebrow">Get help now</p>', '')
    .replace('You do not need to use the search or AI wizard to get urgent help.', 'Choose the help you need now, or find crisis support in your area.')
    .replace('Support types and identities <span aria-hidden="true">↓</span>', 'Support types and identities')
    .replace('<span aria-hidden="true">↻</span> Start again', 'Start again')
    .replace('>A few places to start</h2>', '>Where you could start</h2>')
    .replace('See matching wider support →', 'See matching wider support')
    .replace('Search and filter choices stay in the open page.', 'Guide links carry the selected area back to the directory. This tab also remembers your reading options.')
    .replace('Workforce map ↗', 'Workforce map');
}
