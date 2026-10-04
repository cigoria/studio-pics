<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getImages } from "../api";

const route = useRoute();
const router = useRouter();
const images = ref([]);
const index = ref(0);
const playing = ref(true);
const interval = ref(Number(localStorage.getItem("slideInterval")) || 6);
const uiVisible = ref(true);
const loaded = ref(false);
const root = ref(null);
let timer, hideTimer;

const order = computed(() => images.value);
const current = computed(() => order.value[index.value]);

function next() {
  if (order.value.length) index.value = (index.value + 1) % order.value.length;
}
function prev() {
  if (order.value.length)
    index.value = (index.value - 1 + order.value.length) % order.value.length;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function schedule() {
  clearInterval(timer);
  if (playing.value) timer = setInterval(next, interval.value * 1000);
}
function togglePlay() {
  playing.value = !playing.value;
  schedule();
}
function setInterval_(d) {
  interval.value = Math.min(30, Math.max(2, interval.value + d));
  localStorage.setItem("slideInterval", interval.value);
  schedule();
}
function wake() {
  uiVisible.value = true;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => (uiVisible.value = false), 2800);
}
async function fullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await root.value.requestFullscreen?.().catch(() => {});
}
function leave() {
  if (document.fullscreenElement) document.exitFullscreen();
  router.push("/");
}
function onKey(e) {
  wake();
  if (e.key === "ArrowRight") {
    next();
    schedule();
  } else if (e.key === "ArrowLeft") {
    prev();
    schedule();
  } else if (e.key === " ") {
    e.preventDefault();
    togglePlay();
  } else if (e.key === "f" || e.key === "F") fullscreen();
  else if (e.key === "Escape" && !document.fullscreenElement) leave();
}

onMounted(async () => {
  images.value = shuffle(await getImages(route.params.id));
  loaded.value = true;
  images.value.forEach((im) => {
    const p = new Image();
    p.src = im.url;
  });
  schedule();
  wake();
  window.addEventListener("keydown", onKey);
  root.value?.requestFullscreen?.().catch(() => {});
});
onBeforeUnmount(() => {
  clearInterval(timer);
  clearTimeout(hideTimer);
  window.removeEventListener("keydown", onKey);
  if (document.fullscreenElement) document.exitFullscreen();
});
</script>

<template>
  <div
    ref="root"
    class="show"
    :class="{ idle: !uiVisible }"
    @mousemove="wake"
    @touchstart.passive="wake"
  >
    <template v-if="order.length">
      <transition-group name="fade">
        <div
          v-for="(im, i) in order"
          v-show="i === index"
          :key="im.id"
          class="slide"
        >
          <div class="bg" :style="{ backgroundImage: `url(${im.url})` }"></div>
          <img
            :src="im.url"
            alt=""
            :class="['pic', 'k' + (i % 4)]"
            :style="{ animationDuration: interval + 3 + 's' }"
          />
        </div>
      </transition-group>
      <div class="bar">
        <button @click="leave" aria-label="Vissza">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <span class="spacer"></span>
        <button
          @click="
            prev();
            schedule();
          "
          aria-label="Előző"
        >
          <i class="fa-solid fa-backward-step"></i>
        </button>
        <button
          @click="togglePlay"
          :aria-label="playing ? 'Szünet' : 'Lejátszás'"
        >
          <i :class="playing ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i>
        </button>
        <button
          @click="
            next();
            schedule();
          "
          aria-label="Következő"
        >
          <i class="fa-solid fa-forward-step"></i>
        </button>
        <button @click="setInterval_(-1)" aria-label="Gyorsabb">
          <i class="fa-solid fa-minus"></i>
        </button>
        <span class="sec">{{ interval }} mp</span>
        <button @click="setInterval_(1)" aria-label="Lassabb">
          <i class="fa-solid fa-plus"></i>
        </button>
        <button @click="fullscreen" aria-label="Teljes képernyő">
          <i class="fa-solid fa-expand"></i>
        </button>
      </div>
      <div class="pos">{{ index + 1 }} / {{ order.length }}</div>
    </template>
    <div v-else-if="loaded" class="none">
      <p>Ehhez a felhasználóhoz még nincs kép feltöltve.</p>
      <button class="btn ghost" @click="leave">
        <i class="fa-solid fa-arrow-left"></i> Vissza
      </button>
    </div>
  </div>
</template>

<style scoped>
.show {
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
  cursor: default;
}
.show.idle {
  cursor: none;
}
.slide {
  position: absolute;
  inset: 0;
}
.bg {
  position: absolute;
  inset: -5%;
  background-size: cover;
  background-position: center;
  filter: blur(40px) brightness(0.45);
}
.pic {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  animation: drift linear forwards;
}
.k0 {
  transform-origin: 30% 40%;
}
.k1 {
  transform-origin: 70% 40%;
}
.k2 {
  transform-origin: 40% 70%;
}
.k3 {
  transform-origin: 60% 60%;
}
@keyframes drift {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.07);
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.bar {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 1rem 1.2rem;
  background: linear-gradient(rgba(0, 0, 0, 0.65), transparent);
  transition: opacity 0.4s;
}
.idle .bar,
.idle .pos {
  opacity: 0;
  pointer-events: none;
}
.bar button {
  background: rgba(255, 255, 255, 0.1);
  border: 0;
  color: #fff;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  font-size: 1rem;
}
.bar button:hover {
  background: rgba(255, 255, 255, 0.25);
}
.spacer {
  flex: 1;
}
.sec {
  min-width: 3.2rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 0.9rem;
}
.pos {
  position: absolute;
  right: 1.2rem;
  bottom: 1rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  transition: opacity 0.4s;
  font-variant-numeric: tabular-nums;
}
.none {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}
</style>
