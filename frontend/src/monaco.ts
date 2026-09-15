/**
 * Monaco, cut down to what a read-only code viewer needs.
 *
 * `import * as monaco from 'monaco-editor'` pulls the whole product: tokenizers for
 * every language it ships (abap, solidity, powerquery …) plus the TypeScript, CSS,
 * HTML and JSON language services and their workers. The viewer never edits,
 * completes or diagnoses anything, so all of that was dead weight — 3.4 MB raw,
 * 864 kB gzipped, on the investigate route.
 *
 * `edcore.main` is the same editor with its features (find, diff, go-to-line) and
 * none of the languages. Each import below is one monarch tokenizer of a few kB,
 * chosen from the languages the scenarios actually author — see the `language`
 * fields in backend/src/modules/catalog/content/scenarios/*.json. A language that
 * is not listed still renders; it renders as plain text, without highlighting.
 */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution';
import 'monaco-editor/esm/vs/basic-languages/shell/shell.contribution';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution';
import { loader } from '@guolao/vue-monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

let configured = false;

export function setupMonaco(): void {
  if (configured) return;
  configured = true;

  // The one worker the core editor uses. The json/css/html/ts workers went with
  // their language services: nothing here asks a language a question.
  self.MonacoEnvironment = {
    getWorker: () => new editorWorker(),
  };

  loader.config({ monaco });
}
