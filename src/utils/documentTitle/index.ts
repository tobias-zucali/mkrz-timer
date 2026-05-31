export function buildDocumentTitle({
  appTitle,
  pageTitle,
}: {
  appTitle: string
  pageTitle: string
}) {
  return pageTitle.trim() ? `${pageTitle} - ${appTitle}` : appTitle
}
