import { HighlightExtractResult } from './highlight_and_extract'

export function format_dom_summary_for_llm(
  result: HighlightExtractResult,
  options: {
    maxHrefLength?: number;
    includeRects?: boolean;
    includeText?: boolean;
  } = {}
): string {
  const { maxHrefLength = 60, includeRects = true, includeText = true } = options;
  const { interactiveElements, readableText } = result;

  const sortedInteractive = [...interactiveElements].sort((a, b) => a.rect.top - b.rect.top);

  const interactiveSection = sortedInteractive
    .map((el) => {
      const attrParts: string[] = [];
      if (el.attributes.id) attrParts.push(`id="${el.attributes.id}"`);
      if (el.attributes.name) attrParts.push(`name="${el.attributes.name}"`);
      if (el.attributes.placeholder) attrParts.push(`placeholder="${el.attributes.placeholder}"`);
      if (el.attributes.href) {
        const trimmed =
          el.attributes.href.length > maxHrefLength
            ? el.attributes.href.slice(0, maxHrefLength) + '...'
            : el.attributes.href;
        attrParts.push(`href="${trimmed}"`);
      }
      if (el.attributes.role) attrParts.push(`role="${el.attributes.role}"`);
      if (el.attributes['aria-label']) attrParts.push(`aria-label="${el.attributes['aria-label']}"`);

      const attrString = attrParts.length > 0 ? ` [${attrParts.join(', ')}]` : '';
      const label = el.textContent || '(no visible text)';
      const rectString = includeRects
        ? `\n   [rect: top=${Math.round(el.rect.top)}, left=${Math.round(el.rect.left)}, width=${Math.round(el.rect.width)}, height=${Math.round(el.rect.height)}]`
        : '';

      return `${el.index}. <${el.tagName}> ${label}${attrString}${rectString}`;
    })
    .join('\n');

  return `🧠 PAGE SUMMARY\n\n🔘 INTERACTIVE ELEMENTS:\n${interactiveSection || '(none found)'}\n\n${
    includeText ? `📖 FULL PAGE TEXT:\n${readableText.trim() || '(none found)'}\n\n` : ''
  }Use the [rect] positions to understand element layout. Refer to elements using their numeric index (e.g., "Click element 2").`;
}
