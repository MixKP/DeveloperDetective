<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type * as Monaco from 'monaco-editor';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { setupMonaco } from '@/monaco';

const props = withDefaults(
  defineProps<{
    code: string;
    language: string;
    path: string;
    highlightLines?: number[];
  }>(),
  { highlightLines: () => [] },
);

setupMonaco();

const editor = ref<Monaco.editor.IStandaloneCodeEditor | null>(null);
let decorations: Monaco.editor.IEditorDecorationsCollection | null = null;

/**
 * Read-only, no minimap, no suggestions. This is an inspection surface, not an editor —
 * the learner is reviewing someone else's code, and an editable pane would invite them to
 * "fix" it in a textarea instead of reasoning about it.
 */
const options: Monaco.editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: false },
  lineNumbers: 'on',
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

  decorations ??= instance.createDecorationsCollection();
  decorations.set(
    props.highlightLines.map((line) => ({
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      options: {
        isWholeLine: true,
        className: 'dd-vulnerable-line',
        marginClassName: 'dd-vulnerable-margin',
        // Shown on hover, so the highlight explains itself rather than just glowing red.
        hoverMessage: { value: 'Flagged during the investigation.' },
      },
    })),
  );
}

function onMount(instance: Monaco.editor.IStandaloneCodeEditor) {
  editor.value = instance;
  applyHighlights();
}

// The highlight arrives after the learner solves the locate question, so re-decorating on
// change is the whole point rather than an edge case.
watch(() => [props.highlightLines, props.path], applyHighlights, { deep: true });

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
      <span v-if="highlightLines.length > 0" class="shrink-0 text-sev-critical">
        {{ highlightLines.length }} line{{ highlightLines.length === 1 ? '' : 's' }} flagged
      </span>
    </header>

    <VueMonacoEditor
      :value="code"
      :language="language"
      :path="path"
      theme="vs-dark"
      :options="options"
      class="h-[60vh]"
      @mount="onMount"
    />
  </div>
</template>

<style>
/* Not scoped: Monaco renders decorations outside the component's style scope. */
.dd-vulnerable-line {
  background-color: color-mix(in srgb, var(--dd-sev-critical) 18%, transparent);
}
.dd-vulnerable-margin {
  background-color: var(--dd-sev-critical);
  width: 3px !important;
  margin-left: 3px;
}
</style>
