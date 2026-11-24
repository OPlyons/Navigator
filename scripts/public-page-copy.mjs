// Update the shared public pages before the guide and directory markup is emitted.
export function editPublicPageCopy(template) {
  return template
    .replace('<meta name="theme-color" content="#faf8f0">', '<meta name="theme-color" content="#ffffff">')
    .replace('<meta name="theme-color" content="#075e54">', '')
    .replace('<p class="crisis-eyebrow">Get help now</p>', '')
    .replace('You do not need to use the search or AI wizard to get urgent help.', 'Choose the help you need now, or find crisis support in your area.')
    .replace('Support types and identities <span aria-hidden="true">↓</span>', 'Support types and identities')
    .replace('<span aria-hidden="true">↻</span> Start again', 'Start again')
    .replace('See matching wider support →', 'See matching wider support')
    .replace('Workforce map ↗', 'Workforce map')
    .replace(/(<span class="file-meta">)PDF · (\d+ pages?) · (\d+ KB) <span aria-hidden="true">↓<\/span>/g, '$1PDF, $2, $3');
}
