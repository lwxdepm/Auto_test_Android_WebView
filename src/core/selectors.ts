import { $, $$ } from '@wdio/globals'

function escapeXpathText(text: string): string {
  if (!text.includes("'")) return `'${text}'`
  if (!text.includes('"')) return `"${text}"`
  return `concat(${text.split("'").map((part) => `'${part}'`).join(', "\'", ')})`
}

export const selectors = {
  byTestId(testId: string) {
    return $(`[data-testid="${testId}"]`)
  },

  async byTestIdOrCss(testId: string, css: string) {
    const byId = $(`[data-testid="${testId}"]`)
    if (await byId.isExisting()) return byId
    return $(css)
  },

  exactText(text: string, tag = '*') {
    return $(`//${tag}[normalize-space(.)=${escapeXpathText(text)}]`)
  },

  containsText(text: string, tag = '*') {
    return $(`//${tag}[contains(normalize-space(.), ${escapeXpathText(text)})]`)
  },

  allContainsText(text: string, tag = '*') {
    return $$(`//${tag}[contains(normalize-space(.), ${escapeXpathText(text)})]`)
  },
}
