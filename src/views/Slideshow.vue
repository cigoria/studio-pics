<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as api from "../api";

const route = useRoute();
const router = useRouter();
const images = ref([]);
const index = ref(0);
const playing = ref(true);
const interval = ref(Number(localStorage.getItem("slideInterval")) || 6);
const uiVisible = ref(true);
const loaded = ref(false);
const root = ref(null);
const currentVideo = ref(null);

// Login modal állapota a vetítés alatt
const showAuthModal = ref(false);
const authPw = ref("");
const authError = ref("");
const isAuthed = ref(api.hasPassword());

let timer, hideTimer;

const isAll = computed(() => route.params.id === "all");
const order = computed(() => images.value);
const current = computed(() => order.value[index.value]);

watch(
  () => route.params.id,
  () => {
    loadMedia();
  }
);

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
  // Ha épp egy videó fut, a videó lejátszása szabályozza a továbblépést, de ha a videó megáll vagy kép van, időzítünk
  const curItem = current.value;
  if (playing.value) {
    if (curItem && curItem.mediaType === "video") {
      // Videónál az onEnded esemény hívja a next()-et, de fallbackként adunk egy biztonsági időt
      // Nem indítunk fix rövid timert ha a videó még tart
    } else {
      timer = setInterval(next, interval.value * 1000);
    }
  }
}
function onVideoEnded() {
  if (playing.value) {
    next();
    schedule();
  }
}
function togglePlay() {
  playing.value = !playing.value;
  const vid = currentVideo.value;
  if (vid) {
    if (playing.value) vid.play().catch(() => {});
    else vid.pause();
  }
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
  if (showAuthModal.value) return; // Ha nyitva van a jelszó modal, hagyjuk gépelni
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
  else if (e.key === "l" || e.key === "L") {
    showAuthModal.value = !showAuthModal.value;
  }
}

async function loadMedia() {
  const list = await api.getImages(route.params.id);
  images.value = shuffle(list);
  loaded.value = true;
  images.value.forEach((im) => {
    if (im.mediaType !== "video") {
      const p = new Image();
      p.src = api.getMediaUrl(im.url);
    }
  });
  index.value = 0;
  schedule();
}

async function submitAuth() {
  authError.value = "";
  api.setPassword(authPw.value);
  try {
    await api.login();
    isAuthed.value = true;
    showAuthModal.value = false;
    authPw.value = "";
    await loadMedia();
  } catch (err) {
    authError.value = err.message || "Hibás jelszó";
  }
}

function logout() {
  api.clearPassword();
  isAuthed.value = false;
  loadMedia();
}

onMounted(async () => {
  await loadMedia();
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
    :class="{ idle: !uiVisible && !showAuthModal }"
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
          <!-- Háttér elmosás (videónál és képnél is) -->
          <div
            v-if="im.mediaType !== 'video'"
            class="bg"
            :style="{ backgroundImage: `url(${api.getMediaUrl(im.url)})` }"
          ></div>
          <div v-else class="bg video-bg"></div>

          <!-- Kép megjelenítő -->
          <img
            v-if="im.mediaType !== 'video'"
            :src="api.getMediaUrl(im.url)"
            alt=""
            :class="['pic', 'k' + (i % 4)]"
            :style="{ animationDuration: interval + 3 + 's' }"
          />

          <!-- Videó megjelenítő -->
          <video
            v-else
            ref="currentVideo"
            :src="api.getMediaUrl(im.url)"
            class="pic video-pic"
            autoplay
            playsinline
            :muted="false"
            @ended="onVideoEnded"
          ></video>
        </div>
      </transition-group>
      <div class="bar">
        <button @click="leave" aria-label="Vissza" title='Vissza'>
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
        <button @click="fullscreen" aria-label="Teljes képernyő" title="Teljes képernyő">
          <i class="fa-solid fa-expand"></i>
        </button>
        <button
          @click="router.push(isAll ? '/' : '/show/all')"
          :class="{ 'auth-active': isAll }"
          :title="isAll ? 'Full Random mód aktív (Vissza a profilokhoz)' : 'Váltás Full Random módra (Összes kép)'"
          aria-label="Full Random mód"
        >
          <i class="fa-solid fa-shuffle"></i>
        </button>
        <button
          @click="isAuthed ? logout() : (showAuthModal = true)"
          :class="{ 'auth-active': isAuthed }"
          :title="isAuthed ? 'Bejelentkezve (Kattintson a kijelentkezéshez)' : 'Bejelentkezés privát képekhez'"
          aria-label="Bejelentkezés"
        >
          <i :class="isAuthed ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock'"></i>
        </button>
      </div>
      <div class="pos">
        <span v-if="isAll" class="all-tag" title="Összes kép">
          <i class="fa-solid fa-shuffle"></i> Full Random
        </span>
        <span
          v-if="isAll && current && current.userName"
          class="user-tag"
          :style="{ borderLeftColor: current.userColor || 'var(--accent)' }"
        >
          {{ current.userName }}
        </span>
        <span v-if="current && current.requiresAuth" class="priv-tag"
          ><i class="fa-solid fa-lock"></i> Védett</span
        >
        {{ index + 1 }} / {{ order.length }}
      </div>
    </template>
    <div v-else-if="loaded" class="none">
      <p v-if="isAll">Még nincs megjeleníthető média a rendszerben.</p>
      <p v-else>Ehhez a felhasználóhoz még nincs megjeleníthető média.</p>
      <div class="none-actions">
        <button class="btn ghost" @click="leave">
          <i class="fa-solid fa-arrow-left"></i> Vissza
        </button>
        <button v-if="!isAuthed" class="btn" @click="showAuthModal = true">
          <i class="fa-solid fa-lock"></i> Bejelentkezés privát képekhez
        </button>
      </div>
    </div>

    <!-- Login Modal Slideshow alatt -->
    <div v-if="showAuthModal" class="modal-backdrop" @click.self="showAuthModal = false">
      <div class="auth-modal">
        <h3><i class="fa-solid fa-lock"></i> Bejelentkezés</h3>
        <p>Adja meg a jelszót a privát képek és videók megtekintéséhez.</p>
        <form @submit.prevent="submitAuth">
          <input
            v-model="authPw"
            type="password"
            placeholder="Jelszó"
            autofocus
          />
          <p v-if="authError" class="modal-err">{{ authError }}</p>
          <div class="modal-btns">
            <button type="button" class="btn ghost sm" @click="showAuthModal = false">Mégse</button>
            <button type="submit" class="btn sm">Belépés</button>
          </div>
        </form>
      </div>
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
.bar button.auth-active {
  background: var(--accent);
  color: #1a1405;
}
.video-bg {
  background: #000;
}
.video-pic {
  animation: none;
}
.all-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(242, 180, 65, 0.25);
  color: var(--accent);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-right: 0.5rem;
  vertical-align: middle;
}
.user-tag {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border-left: 3px solid var(--accent);
  padding: 0.15rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.5rem;
  vertical-align: middle;
}
.priv-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(242, 180, 65, 0.25);
  color: var(--accent);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-right: 0.6rem;
  vertical-align: middle;
}
.none-actions {
  display: flex;
  gap: 0.8rem;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.2s ease;
}
.auth-modal {
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 1.8rem;
  border-radius: 12px;
  width: 90%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}
.auth-modal h3 {
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.auth-modal p {
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.4;
}
.auth-modal input {
  width: 100%;
  padding: 0.65rem 0.8rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text);
  margin-bottom: 0.5rem;
}
.modal-err {
  color: #ff7b6b;
  font-size: 0.85rem;
}
.modal-btns {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.5rem;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
