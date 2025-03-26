import { Page } from 'playwright';

export type BoundingRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type InteractiveElement = {
  index: number;
  tagName: string;
  textContent: string;
  attributes: Record<string, string>;
  rect: BoundingRect;
};

export type HighlightExtractResult = {
  interactiveElements: InteractiveElement[];
  readableText: string;
};

export async function highlight_and_extract(page: Page, timeoutMs = 2000): Promise<HighlightExtractResult> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
    window.scrollTo({ top: 0 });
  });

  await Promise.race([
    page.waitForLoadState('networkidle'),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);

  const result = await page.evaluate(() => {
    const interactiveSelector = [
      'a',
      'button',
      'input',
      'select',
      'textarea',
      '[role=button]',
      '[onclick]',
      '[tabindex]',
    ].join(',');

    const isVisible = (el: Element) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const getAttributes = (el: Element): Record<string, string> => {
      const attrs: Record<string, string> = {};
      for (const attr of el.getAttributeNames()) {
        attrs[attr] = el.getAttribute(attr) || '';
      }
      return attrs;
    };

    const containerId = 'highlight-container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '999999';
      document.body.appendChild(container);
    }

    const elements: InteractiveElement[] = [];
    let index = 0;
    for (const el of document.querySelectorAll(interactiveSelector)) {
      if (!isVisible(el)) continue;

      const rect = el.getBoundingClientRect();
      const textContent = (el.textContent || '').trim();
      const attributes = getAttributes(el);

      (el as HTMLElement).setAttribute('data-index', index.toString());

      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.border = '2px solid #ADD8E6';
      overlay.style.backgroundColor = 'rgba(173, 216, 230, 0.2)';
      overlay.style.pointerEvents = 'none';
      overlay.style.boxSizing = 'border-box';

      const label = document.createElement('div');
      label.textContent = index.toString();
      label.style.position = 'absolute';
      label.style.top = '0px';
      label.style.left = '0px';
      label.style.background = '#ADD8E6';
      label.style.color = 'white';
      label.style.fontSize = '12px';
      label.style.padding = '2px';
      label.style.pointerEvents = 'none';

      overlay.appendChild(label);
      container.appendChild(overlay);

      elements.push({
        index,
        tagName: el.tagName.toLowerCase(),
        textContent,
        attributes,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      });

      index++;
    }

    return {
      interactiveElements: elements,
      readableText: document.body.innerText,
    };
  });

  return result;
}
