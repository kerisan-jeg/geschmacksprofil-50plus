// Kleine DOM-Umgebung für Komponententests (jsdom), ohne weitere Testbibliothek.
// render() zeigt eine Komponente, click() löst einen Klick aus; beides in act(), wie React es verlangt.
import { JSDOM } from 'jsdom';

const GLOBALS = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLButtonElement',
  'HTMLIFrameElement',
  'Element',
  'Node',
  'Text',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'FocusEvent',
  'InputEvent',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'MutationObserver',
];

export function setupDom() {
  const dom = new JSDOM('<!doctype html><html lang="de-CH"><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  for (const key of GLOBALS) {
    Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return dom;
}

export async function render(element) {
  const { act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return {
    container,
    rerender: (next) => act(async () => root.render(next)),
    unmount: () => act(async () => root.unmount()),
  };
}

export async function click(node) {
  const { act } = await import('react');
  await act(async () => {
    node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

export async function type(input, value) {
  const { act } = await import('react');
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

export function buttonByText(container, text) {
  return [...container.querySelectorAll('button')].find((button) => button.textContent.trim() === text) ?? null;
}
