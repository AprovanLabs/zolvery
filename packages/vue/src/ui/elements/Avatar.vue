<script lang="ts" setup>
import { defineProps, onMounted, watchEffect, computed, ref } from 'vue';

interface Info<T = number> {
  value?: T;
  severity?: 'secondary' | 'info' | 'success' | 'warn' | 'danger' | 'contrast';
}

interface Action {
  value?: string;
  timeout?: number;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

interface Decoration {
  icon?: string;
  label?: string;
}

const {
  primary,
  secondary,
  countdown,
  action,
  decoration,
  active = false,
} = defineProps<{
  primary?: Info;
  secondary?: Info;
  countdown?: number;
  active?: boolean;
  decoration?: Decoration;
  action?: Action;
}>();

const progress = ref(countdown);

onMounted(() => {
  if (countdown) {
    const interval = setInterval(() => {
      progress.value -= 0.01;
      if (progress.value <= 0) {
        clearInterval(interval);
      }
    }, 10);
  }
});

const tooltip = computed(() => {
  if (!action) return;
  const position = action?.position || 'top';

  const style = {
    top: {
      borderTopColor: 'var(--p-surface-950)',
    },
    right: {
      borderRightColor: 'var(--p-surface-950)',
    },
    bottom: {
      borderBottomColor: 'var(--p-surface-950)',
    },
    left: {
      borderLeftColor: 'var(--p-surface-950)',
    },
  }[position];

  return {
    value: action.value,
    position,
    escape: false,
    fitContent: false,
    unstyled: false,
    pt: {
      arrow: { style },
      text: 'bg-surface-0 text-primary-contrast shadow-none border-4 border-surface-950 rounded-md',
    },
  };
});

const tooltipRef = ref(null);

watchEffect(() => {
  if (!tooltip || !tooltipRef.value) {
    return;
  }

  const event = new MouseEvent('mouseenter');
  const triggerHover = () => {
    setTimeout(() => tooltipRef.value.dispatchEvent(event), 50);
  };
  triggerHover();

  // Re-trigger hover on resize
  window.addEventListener('resize', triggerHover);

  // Remove tooltip on timeout
  if (action.timeout) {
    setTimeout(() => {
      const event = new MouseEvent('mouseleave');
      tooltipRef.value.dispatchEvent(event);
      removeEventListener('resize', triggerHover);
    }, action.timeout * 1000);
  }

  // Cleanup
  return () => {
    removeEventListener('resize', triggerHover);
  };
});
</script>

<template>
  <div
    class="relative m-2 transition-all ease-in-out hover:scale-110 hover:cursor-pointer"
    v-bind="ptmi('root')"
    :class="cx('root')"
  >
    <div
      class="absolute block w-full h-full pointer-events-none"
      v-if="tooltip?.position"
      ref="tooltipRef"
      v-tooltip:[tooltip]="tooltip"
    />

    <PrimeAvatar
      class="overflow-hidden rounded-full"
      v-bind="$props"
      :pt="ptm('pcBadge')"
    />

    <!-- Values -->
    <PrimeBadge
      v-if="primary?.value !== undefined"
      :value="primary?.value"
      :severity="primary?.severity"
      class="absolute bottom-0 right-0 text-white"
      :class="[
        $props.size === 'large' && 'w-3 h-3',
        $props.size === 'xlarge' && 'w-4 h-4',
      ]"
    />
    <PrimeBadge
      v-if="secondary?.value !== undefined"
      :value="secondary?.value"
      :severity="secondary?.severity"
      class="absolute bottom-0 left-0 text-white"
      :class="[
        $props.size === 'large' && 'w-3 h-3',
        $props.size === 'xlarge' && 'w-4 h-4',
      ]"
    />

    <!-- Decoration -->
    <div
      v-if="decoration"
      class="absolute top-0 -translate-x-1/2 -translate-y-3/4 left-1/2"
    >
      <span
        v-if="decoration.icon"
        :class="[decoration.icon]"
      ></span>
    </div>

    <!-- Turn status -->
    <div
      class="absolute bottom-0 w-8 h-1 overflow-hidden text-xs font-bold bg-gray-700 rounded-md opacity-70"
      v-if="active || countdown !== undefined"
      v-motion
      :initial="{ scale: 0.5, opacity: 0, translateY: '300%' }"
      :enter="{
        scale: 1,
        opacity: 1,
        transition: {
          type: 'spring',
          stiffness: 250,
          damping: 10,
        },
      }"
      :leave="{
        scale: 0.5,
        opacity: 0,
        transition: {
          type: 'spring',
          stiffness: 250,
          damping: 10,
        },
      }"
    >
      <div
        class="relative w-0 h-2 bg-white"
        :style="{ width: (progress / countdown) * 100 + '%' }"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import PrimeAvatar from 'primevue/avatar';
import PrimeBadge from 'primevue/badge';
import PrimeChip from 'primevue/chip';

export default {
  name: 'Avatar',
  extends: PrimeAvatar,
  inheritAttrs: false,
  components: {
    PrimeAvatar,
    PrimeBadge,
    PrimeChip,
  },
};

// x("//*[contains(.,'Bid 1')]")
</script>
