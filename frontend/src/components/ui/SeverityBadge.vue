<script setup lang="ts">
import { computed } from 'vue';
import { ShieldAlert } from 'lucide-vue-next';
import type { Severity } from '@dd/shared';
import { severityStyles } from '@/design/theme';

const props = defineProps<{ severity: Severity }>();

const style = computed(() => severityStyles[props.severity]);
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1"
    :class="[style.text, style.bg, style.ring]"
  >
    <ShieldAlert class="size-3.5" aria-hidden="true" />
    {{ severity }}
  </span>
</template>
