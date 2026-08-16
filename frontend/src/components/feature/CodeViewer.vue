<script setup lang="ts">
import { onBeforeUnmount, shallowRef, watch } from 'vue';
import type * as Monaco from 'monaco-editor';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { setupMonaco } from '@/monaco';

const props = withDefaults(
  defineProps<{
    code: string;
    language: string;
    path: string;
    highlightLines?: number[];
    changedLines?: number[];
  }>(),
  { highlightLines: () => [], changedLines: () => [] },
);

setupMonaco();

const editor = shallowRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
let decorations: Monaco.editor.IEditorDecorationsCollection | null = null;

const options: Monaco.editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: false },
  lineNumbers: 'on',
  // Reserve room between the line numbers and the code for the marker bars.
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
};

function applyHighlights() {
  const instance = editor.value;
  if (!instance) return;

  // Both markers use linesDecorations, not margin: a margin decoration lands on the far
  // side of the line-number gutter, where it reads as an edge artifact rather than as a
  // mark on the line. This zone sits directly against the code.
  //
  // Changed lines go on first so a line that is both keeps the vulnerable styling on top,
  // and they take a much fainter tint — there are usually five times as many of them, and
  // they must not compete with the two that matter once the answer is unlocked.
  const changed = props.changedLines.map((line) => ({
    range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
    options: {
      isWholeLine: true,
      className: 'dd-changed-line',
      linesDecorationsClassName: 'dd-changed-gutter',
      hoverMessage: { value: 'Changed by the deploy in the brief.' },
    },
  }));

  const vulnerable = props.highlightLines.map((line) => ({
    range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
    options: {
      isWholeLine: true,
      className: 'dd-vulnerable-line',
      linesDecorationsClassName: 'dd-vulnerable-gutter',
      hoverMessage: { value: 'Flagged during the investigation.' },
    },
  }));

  decorations ??= instance.createDecorationsCollection();
  decorations.set([...changed, ...vulnerable]);
}

function onMount(instance: Monaco.editor.IStandaloneCodeEditor) {
  editor.value = instance;
  applyHighlights();
}

watch(() => [props.highlightLines, props.changedLines, props.path], applyHighlights, {
  deep: true,
});

onBeforeUnmount(() => {
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
        <span v-if="changedLines.length > 0" class="flex items-center gap-1.5 text-code-muted">
          <span class="h-3 w-[3px] rounded-full bg-primary" aria-hidden="true" />
          {{ changedLines.length }} changed in this deploy
        </span>
        <span v-if="highlightLines.length > 0" class="flex items-center gap-1.5 text-sev-critical">
          <span class="h-3 w-[3px] rounded-full bg-sev-critical" aria-hidden="true" />
          {{ highlightLines.length }} flagged
        </span>
      </span>
    </header>

    <div class="h-[60vh] min-h-80">
      <VueMonacoEditor
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
.dd-changed-line {
  background-color: color-mix(in srgb, var(--dd-primary) 10%, transparent);
}
.dd-changed-gutter {
  background-color: var(--dd-primary);
  width: 4px !important;
  left: 4px !important;
}
</style>
