<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';
import type * as Monaco from 'monaco-editor';
import { VueMonacoDiffEditor, VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { setupMonaco } from '@/monaco';

const props = withDefaults(
  defineProps<{
    code: string;
    language: string;
    path: string;
    highlightLines?: number[];
    previousCode?: string | null;
  }>(),
  { highlightLines: () => [], previousCode: null },
);

setupMonaco();

// A file with a before is a file the incident's deploy touched, and that is exactly
// when a diff is worth showing. Everything else opens as a plain read-only file.
const isDiff = computed(() => props.previousCode !== null);

const editor = shallowRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
let decorations: Monaco.editor.IEditorDecorationsCollection | null = null;
let modelListener: Monaco.IDisposable | null = null;

const shared = {
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: false },
  lineNumbers: 'on',
  // Reserve room between the line numbers and the code for the vulnerable-line bar.
  lineDecorationsWidth: 12,
  scrollBeyondLastLine: false,
  fontSize: 13,
  automaticLayout: true,
  renderLineHighlight: 'none',
  contextmenu: false,
  quickSuggestions: false,
  occurrencesHighlight: 'off',
  folding: false,
  scrollbar: { alwaysConsumeMouseWheel: false },
} as const;

const options: Monaco.editor.IStandaloneEditorConstructionOptions = { ...shared };

const diffOptions: Monaco.editor.IStandaloneDiffEditorConstructionOptions = {
  ...shared,
  // Inline, so the file still reads top to bottom as a file. Side by side would halve
  // the width the code has and make following a call chain harder than reading a diff
  // is worth. `renderIndicators` puts the +/- in the gutter next to the colour.
  renderSideBySide: false,
  renderIndicators: true,
  renderMarginRevertIcon: false,
  originalEditable: false,
  ignoreTrimWhitespace: false,
};

function applyHighlights() {
  const instance = editor.value;
  if (!instance) return;

  decorations ??= instance.createDecorationsCollection();
  decorations.set(
    props.highlightLines.map((line) => ({
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      options: {
        isWholeLine: true,
        className: 'dd-vulnerable-line',
        linesDecorationsClassName: 'dd-vulnerable-gutter',
        hoverMessage: { value: 'Flagged during the investigation.' },
      },
    })),
  );
}

/**
 * Decorations belong to a model, not to an editor. Switching file swaps the model out
 * from under the collection, which silently drops every mark — so rebuild them whenever
 * the model changes rather than trusting a watch on the props to fire late enough.
 */
function track(instance: Monaco.editor.IStandaloneCodeEditor) {
  modelListener?.dispose();
  decorations = null;
  editor.value = instance;
  modelListener = instance.onDidChangeModel(() => {
    decorations = null;
    applyHighlights();
  });
  applyHighlights();
}

function onMount(instance: Monaco.editor.IStandaloneCodeEditor) {
  track(instance);
}

function onDiffMount(instance: Monaco.editor.IStandaloneDiffEditor) {
  track(instance.getModifiedEditor());
}

watch(() => [props.highlightLines, props.path], applyHighlights, { deep: true });

onBeforeUnmount(() => {
  modelListener?.dispose();
  decorations?.clear();
  decorations = null;
});
</script>

<template>
  <div class="overflow-hidden rounded-[var(--dd-radius)] bg-code-bg">
    <header
      class="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5 text-xs"
    >
      <span class="truncate font-mono text-code-text">{{ path }}</span>
      <span class="flex shrink-0 items-center gap-3">
        <span v-if="isDiff" class="text-code-muted">
          <span class="text-quality-good">+</span>
          <span class="text-sev-critical">−</span>
          changed in this deploy
        </span>
        <span v-if="highlightLines.length > 0" class="flex items-center gap-1.5 text-sev-critical">
          <span class="h-3 w-[3px] rounded-full bg-sev-critical" aria-hidden="true" />
          {{ highlightLines.length }} flagged
        </span>
      </span>
    </header>

    <div class="h-[60vh] min-h-80">
      <VueMonacoDiffEditor
        v-if="isDiff"
        :original="previousCode ?? ''"
        :modified="code"
        :language="language"
        :original-model-path="`${path}~before`"
        :modified-model-path="path"
        theme="vs-dark"
        :options="diffOptions"
        width="100%"
        height="100%"
        @mount="onDiffMount"
      />
      <VueMonacoEditor
        v-else
        :value="code"
        :language="language"
        :path="path"
        theme="vs-dark"
        :options="options"
        width="100%"
        height="100%"
        @mount="onMount"
      />
    </div>
  </div>
</template>

<style>
.dd-vulnerable-line {
  background-color: color-mix(in srgb, var(--dd-sev-critical) 18%, transparent);
}
.dd-vulnerable-gutter {
  background-color: var(--dd-sev-critical);
  width: 4px !important;
  left: 4px !important;
}
</style>
