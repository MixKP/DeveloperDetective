<script setup lang="ts">
import { computed, ref } from 'vue';
import { Scale } from 'lucide-vue-next';
import type { EthicalChoiceView, EthicalOutcome } from '@dd/shared';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import { qualityLabels, qualityStyles } from '@/design/theme';

const props = defineProps<{
  choices: EthicalChoiceView[];
  outcome: EthicalOutcome | null;
  busy: boolean;
}>();
const emit = defineEmits<{ choose: [choiceId: number] }>();

const selected = ref<number | null>(null);

const decided = computed(() => props.outcome !== null);
const outcomeStyle = computed(() => (props.outcome ? qualityStyles[props.outcome.quality] : null));
</script>

<template>
  <BaseCard class="flex flex-col gap-4 p-5">
    <header>
      <h2 class="flex items-center gap-2 text-sm font-semibold">
        <Scale class="size-4 text-primary" aria-hidden="true" />
        The call is yours
      </h2>
      <p class="mt-1 text-sm text-muted">
        You have the fix. Now decide how to handle it — and note that this decision cannot be
        retaken.
      </p>
    </header>

    <fieldset class="flex flex-col gap-2" :disabled="decided || busy">
      <label
        v-for="choice in choices"
        :key="choice.id"
        class="flex cursor-pointer items-start gap-3 rounded-[var(--dd-radius-sm)] px-3 py-2.5 text-sm ring-1 transition"
        :class="[
          selected === choice.id ? 'ring-primary' : 'ring-border',
          decided ? 'cursor-default' : 'hover:ring-primary/40',
          decided && outcome?.choiceId !== choice.id ? 'opacity-50' : '',
        ]"
      >
        <input
          v-model="selected"
          type="radio"
          name="ethical-choice"
          :value="choice.id"
          class="mt-0.5 accent-primary"
        />
        <span>{{ choice.text }}</span>
      </label>
    </fieldset>

    <div
      v-if="outcome && outcomeStyle"
      class="rounded-[var(--dd-radius-sm)] px-4 py-3 ring-1"
      :class="[outcomeStyle.bg, outcomeStyle.ring]"
    >
      <p class="text-sm font-semibold" :class="outcomeStyle.text">
        {{ qualityLabels[outcome.quality] }}
      </p>
      <p class="mt-1 text-sm text-muted">{{ outcome.outcome }}</p>
    </div>

    <BaseButton
      v-else
      class="self-start"
      :disabled="selected === null || busy"
      @click="selected !== null && emit('choose', selected)"
    >
      Commit to this decision
    </BaseButton>
  </BaseCard>
</template>
