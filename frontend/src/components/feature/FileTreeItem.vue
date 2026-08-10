<script setup lang="ts">
import { ref } from 'vue';
import { ChevronRight, FileCode2, Folder, GitCommitHorizontal } from 'lucide-vue-next';
import type { TreeNode } from '@/utils/fileTree';

defineProps<{ node: TreeNode; activePath: string; depth: number }>();
const emit = defineEmits<{ select: [path: string] }>();

const open = ref(true);
</script>

<template>
  <li>
    <template v-if="node.kind === 'folder'">
      <button
        type="button"
        class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm text-code-muted hover:bg-code-surface"
        :style="{ paddingLeft: `${depth * 12 + 8}px` }"
        :aria-expanded="open"
        @click="open = !open"
      >
        <ChevronRight
          class="size-3.5 shrink-0 transition-transform"
          :class="open ? 'rotate-90' : ''"
          aria-hidden="true"
        />
        <Folder class="size-3.5 shrink-0" aria-hidden="true" />
        <span class="truncate">{{ node.name }}</span>
      </button>

      <ul v-show="open">
        <FileTreeItem
          v-for="child in node.children"
          :key="child.path"
          :node="child"
          :active-path="activePath"
          :depth="depth + 1"
          @select="emit('select', $event)"
        />
      </ul>
    </template>

    <button
      v-else
      type="button"
      class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm transition"
      :class="
        node.path === activePath
          ? 'bg-code-surface text-code-text'
          : 'text-code-muted hover:bg-code-surface/60'
      "
      :style="{ paddingLeft: `${depth * 12 + 22}px` }"
      @click="emit('select', node.path)"
    >
      <FileCode2 class="size-3.5 shrink-0" aria-hidden="true" />
      <span class="truncate">{{ node.name }}</span>
      <GitCommitHorizontal
        v-if="node.file.recentlyChanged"
        class="ml-auto size-3.5 shrink-0 text-sev-high"
        aria-label="Changed in the deploy under investigation"
      />
    </button>
  </li>
</template>
