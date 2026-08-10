<script setup lang="ts">
import { Banknote, Stethoscope, Wrench } from 'lucide-vue-next';
import type { Debrief } from '@dd/shared';
import BaseCard from '@/components/ui/BaseCard.vue';

defineProps<{ debrief: Debrief }>();

const sections = [
  { key: 'rootCause', title: 'Technical root cause', icon: Stethoscope },
  { key: 'businessImpact', title: 'Business impact', icon: Banknote },
  { key: 'remediation', title: 'Remediation', icon: Wrench },
] as const;
</script>

<template>
  <div class="grid gap-4 md:grid-cols-3">
    <BaseCard v-for="section in sections" :key="section.key" class="p-5">
      <h2 class="flex items-center gap-2 text-sm font-semibold">
        <component :is="section.icon" class="size-4 text-primary" aria-hidden="true" />
        {{ section.title }}
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-muted">{{ debrief[section.key] }}</p>
    </BaseCard>
  </div>
</template>
