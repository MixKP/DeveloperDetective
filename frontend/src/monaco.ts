import * as monaco from 'monaco-editor';
import { loader } from '@guolao/vue-monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

/**
 * Monaco setup, isolated so CodeViewer is the only component that ever touches the API.
 *
 * Three deliberate choices:
 *
 *  - The editor is bundled locally rather than loaded from a CDN. `@monaco-editor/loader`
 *    defaults to fetching from jsDelivr, which would mean the app silently breaks with no
 *    network — an unacceptable failure mode for a graded demo on conference wifi.
 *
 *  - Only the editor worker is registered. The TypeScript worker exists to provide
 *    diagnostics and completions, neither of which a read-only viewer can use, and it
 *    alone was 6 MB of the bundle. Syntax highlighting comes from the Monarch tokenizer
 *    on the main thread and is unaffected.
 *
 *  - Language validation is switched off explicitly. The scenarios contain deliberately
 *    broken code; red squiggles from a linter would point at the bug before the learner
 *    has had a chance to find it, which is precisely the giveaway the reveal rules exist
 *    to prevent.
 */
let configured = false;

export function setupMonaco(): void {
  if (configured) return;
  configured = true;

  self.MonacoEnvironment = {
    getWorker: () => new editorWorker(),
  };

  const noValidation = { noSemanticValidation: true, noSyntaxValidation: true };
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(noValidation);
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(noValidation);

  loader.config({ monaco });
}
