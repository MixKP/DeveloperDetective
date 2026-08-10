import * as monaco from 'monaco-editor';
import { loader } from '@guolao/vue-monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

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
