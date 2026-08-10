<script setup lang="ts">
import { computed } from 'vue';
import { FolderGit2 } from 'lucide-vue-next';
import type { CodeFile } from '@dd/shared';
import FileTreeItem from './FileTreeItem.vue';
import { buildFileTree } from '@/utils/fileTree';

const props = defineProps<{ files: CodeFile[]; activePath: string }>();
const emit = defineEmits<{ select: [path: string] }>();

const tree = computed(() => buildFileTree(props.files));
const changedCount = computed(() => props.files.filter((f) => f.recentlyChanged).length);
</script>

<template>
  <aside class="flex flex-col overflow-hidden rounded-[var(--dd-radius)] bg-code-bg">
    <header class="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
      <FolderGit2 class="size-4 text-code-muted" aria-hidden="true" />
      <span class="text-xs font-medium tracking-wide text-code-text uppercase">Repository</span>
    </header>

    <!--
      min-h-0: a flex child defaults to min-height:auto, so overflow-y-auto would grow the
      column instead of scrolling inside it. overscroll-contain stops a scroll that reaches
      the end of the tree from chaining to the page.
    -->
    <ul class="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
      <FileTreeItem
        v-for="node in tree"
        :key="node.path"
        :node="node"
        :active-path="activePath"
        :depth="0"
        @select="emit('select', $event)"
      />
    </ul>

    <footer class="border-t border-white/5 px-3 py-2 text-xs text-code-muted">
      {{ changedCount }} file{{ changedCount === 1 ? '' : 's' }} changed in this deploy
    </footer>
  </aside>
</template>
