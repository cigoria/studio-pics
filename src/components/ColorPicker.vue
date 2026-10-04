<script setup>
import { ref, watch, computed } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "#e0527a",
  },
});

const emit = defineEmits(["update:modelValue"]);

const isCustom = ref(false);
const hexInput = ref(props.modelValue || "#e0527a");

// Presets grouped by theme
const presetColors = [
  // Vibrant
  "#e0527a",
  "#ef4444",
  "#ee7b30",
  "#f2b441",
  "#84cc16",
  "#10b981",
  "#59c9a5",
  "#06b6d4",
  "#3fa7d6",
  "#3b82f6",
  "#6366f1",
  "#8e6bd8",
  "#a855f7",
  "#ec4899",
  // Pastel & Deep
  "#fda4af",
  "#fcd34d",
  "#86efac",
  "#67e8f9",
  "#93c5fd",
  "#c4b5fd",
  "#f472b6",
  "#475569",
  "#1e293b",
  "#0f172a",
];

// Check if current value is in presets
const isInPresets = computed(() =>
  presetColors.some(
    (c) => c.toLowerCase() === (props.modelValue || "").toLowerCase(),
  ),
);

// If initial color is not in presets, automatically default to custom mode
if (!isInPresets.value && props.modelValue) {
  isCustom.value = true;
}

watch(
  () => props.modelValue,
  (val) => {
    if (val && val !== hexInput.value) {
      hexInput.value = val;
    }
  },
);

function selectColor(color) {
  hexInput.value = color;
  emit("update:modelValue", color);
}

function onHexInputChange(e) {
  let val = e.target.value.trim();
  if (val && !val.startsWith("#")) {
    val = "#" + val;
  }
  hexInput.value = val;
  if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
    emit("update:modelValue", val);
  }
}

function onNativeColorChange(e) {
  const val = e.target.value;
  hexInput.value = val;
  emit("update:modelValue", val);
}
</script>

<template>
  <div class="color-picker-wrap">
    <div class="picker-top">
      <span class="picker-label">
        <i class="fa-solid fa-palette"></i> Szín
      </span>
      <div class="mode-switch">
        <button
          type="button"
          class="switch-btn"
          :class="{ active: !isCustom }"
          @click="isCustom = false"
        >
          Paletta
        </button>
        <button
          type="button"
          class="switch-btn"
          :class="{ active: isCustom }"
          @click="isCustom = true"
        >
          Egyéni HEX
        </button>
      </div>
    </div>

    <!-- Presets View -->
    <div v-if="!isCustom" class="swatches-grid">
      <button
        type="button"
        v-for="c in presetColors"
        :key="c"
        class="swatch"
        :style="{ background: c }"
        :class="{ sel: c.toLowerCase() === (modelValue || '').toLowerCase() }"
        :aria-label="'Szín ' + c"
        @click="selectColor(c)"
      >
        <i
          v-if="c.toLowerCase() === (modelValue || '').toLowerCase()"
          class="fa-solid fa-check check-icon"
        ></i>
      </button>
    </div>

    <!-- Custom HEX View -->
    <div v-else class="custom-color-box">
      <div class="color-input-row">
        <label class="color-preview-trigger" :style="{ background: hexInput }">
          <input
            type="color"
            :value="/^#[0-9A-Fa-f]{6}$/.test(hexInput) ? hexInput : '#e0527a'"
            @input="onNativeColorChange"
          />
          <i class="fa-solid fa-eye-dropper"></i>
        </label>
        <div class="hex-field">
          <input
            type="text"
            v-model="hexInput"
            placeholder="#e0527a"
            maxlength="9"
            spellcheck="false"
            @input="onHexInputChange"
          />
        </div>
      </div>
      <small class="hint"
        >Írj be tetszőleges HEX kódot vagy kattints a pipettára.</small
      >
    </div>
  </div>
</template>

<style scoped>
.color-picker-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.75rem;
}

.picker-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.mode-switch {
  display: inline-flex;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.switch-btn {
  background: transparent;
  border: 0;
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  color: var(--muted);
  font-weight: 500;
  transition: all 0.15s ease;
}

.switch-btn:hover {
  color: var(--text);
}

.switch-btn.active {
  background: var(--accent);
  color: #1a1405;
  font-weight: 600;
}

.swatches-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.4rem;
}

.swatch {
  aspect-ratio: 1;
  border-radius: 6px;
  border: 2px solid transparent;
  display: grid;
  place-items: center;
  transition:
    transform 0.12s,
    border-color 0.12s;
  padding: 0;
}

.swatch:hover {
  transform: scale(1.12);
}

.swatch.sel {
  border-color: #fff;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
}

.check-icon {
  font-size: 0.7rem;
  color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}

.custom-color-box {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.color-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-preview-trigger {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 6px;
  border: 1px solid var(--line);
  display: grid;
  place-items: center;
  cursor: pointer;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.color-preview-trigger input[type="color"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.color-preview-trigger i {
  color: #fff;
  font-size: 0.85rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
  pointer-events: none;
}

.hex-field {
  flex: 1;
}

.hex-field input {
  font-family: monospace;
  font-size: 0.95rem;
  letter-spacing: 0.05em;
  padding: 0.45rem 0.65rem;
  border-radius: 6px;
  background: var(--panel);
  border: 1px solid var(--line);
  width: 100%;
}

.hint {
  font-size: 0.72rem;
  color: var(--muted);
}
</style>
