// Kurze Befragung und Abschlussbestätigung (29.10.2026)
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buttonByText, click, render, setupDom } from '../test/dom.js';

const dom = setupDom();
after(() => dom.window.close());
dom.window.Element.prototype.scrollIntoView ??= () => {};
const { act } = await import('react');
const { default: SurveyScreen } = await import('./SurveyScreen.jsx');
const { default: FinishScreen } = await import('./FinishScreen.jsx');
const { SURVEY, FINISH } = await import('../labels.js');
const { SYNC_STATES } = await import('../sync/sync.js');

test('Befragung: vier Auswahlfragen sind Pflicht, die Anmerkung freiwillig; Absenden liefert Zahlen', async () => {
  const submitted = [];
  const { container, unmount } = await render(createElement(SurveyScreen, { firstName: 'Anna', onSubmit: (values) => submitted.push(values), onBack() {} }));
  const text = container.textContent;
  for (const scale of SURVEY.scales) assert.ok(text.includes(scale.question), scale.id);
  assert.equal(container.querySelectorAll('[role="radiogroup"]').length, 4);
  assert.equal(container.querySelectorAll('input[type="radio"]').length, 5 + 5 + 5 + 3);
  assert.ok(container.querySelector('textarea#survey-remarks'));
  // Ohne Antworten: Fehlermeldung je offener Frage, nichts abgeschickt
  await click(buttonByText(container, SURVEY.submit));
  // Die Fehlermeldung erscheint im nächsten Frame (requestAnimationFrame)
  await act(async () => new Promise((resolve) => setTimeout(resolve, 40)));
  assert.equal(container.querySelectorAll('[role="alert"]').length, 4);
  assert.deepEqual(submitted, []);
  // Alle vier wählen, Anmerkung eintippen
  await click(container.querySelector('input[name="survey-ease"][value="5"]'));
  await click(container.querySelector('input[name="survey-clarity"][value="4"]'));
  await click(container.querySelector('input[name="survey-fit"][value="3"]'));
  await click(container.querySelector('input[name="survey-length"][value="2"]'));
  const textarea = container.querySelector('textarea');
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, '  Die Bilder waren toll  ');
    textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  await click(buttonByText(container, SURVEY.submit));
  assert.deepEqual(submitted, [{ ease: 5, clarity: 4, fit: 3, length: 2, remarks: 'Die Bilder waren toll' }]);
  await unmount();
});

test('Abschlussbestätigung: erst nach erfolgreicher Übertragung „Vielen Dank“; vorher Warten, bei Fehler „Erneut senden“', async () => {
  const base = { firstName: 'Anna', sessionId: 'abc123def456', onRetry() {}, onToProfile() {} };
  const html = (sync) => renderToStaticMarkup(createElement(FinishScreen, { ...base, sync }));
  const sending = html({ enabled: true, state: SYNC_STATES.SENDING });
  assert.ok(sending.includes(FINISH.sendingTitle) && sending.includes(FINISH.sending));
  assert.ok(!sending.includes(FINISH.ok) && !sending.includes('Vielen Dank'));
  const ok = html({ enabled: true, state: SYNC_STATES.OK });
  assert.ok(ok.includes('Vielen Dank, Anna!') && ok.includes(FINISH.ok) && ok.includes('abc123def456'));
  assert.ok(!ok.includes(FINISH.retry));
  const failed = html({ enabled: true, state: SYNC_STATES.ERROR, lastError: 'HTTP 503' });
  assert.ok(failed.includes(FINISH.errorTitle) && failed.includes(FINISH.retry) && !failed.includes(FINISH.ok));
  const local = html({ enabled: false, state: SYNC_STATES.OFF });
  assert.ok(local.includes('Vielen Dank, Anna!') && local.includes(FINISH.local) && !local.includes(FINISH.ok));
  // „Erneut senden“ löst den Versuch aus
  let retried = 0;
  const { container, unmount } = await render(createElement(FinishScreen, { ...base, sync: { enabled: true, state: SYNC_STATES.ERROR }, onRetry: () => (retried += 1) }));
  await click(buttonByText(container, FINISH.retry));
  assert.equal(retried, 1);
  await unmount();
});
