<script setup>
import { ref, computed, onMounted } from "vue";
import * as api from "../api";
import ColorPicker from "../components/ColorPicker.vue";
import IconPicker from "../components/IconPicker.vue";

const authed = ref(false);
const pw = ref("");
const error = ref("");
const users = ref([]);
const selected = ref(null);
const images = ref([]);
const showNewUser = ref(false);
const newName = ref("");
const newColor = ref("#e0527a");
const newIcon = ref("fa-solid fa-user");
const newOrder = ref(1);
const editingUser = ref(false);
const editName = ref("");
const editColor = ref("#e0527a");
const editIcon = ref("fa-solid fa-user");
const editOrder = ref(1);
const busy = ref(false);
const dragging = ref(false);
const notice = ref("");

const selectedUser = computed(() =>
  users.value.find((u) => u.id === selected.value),
);

function say(m) {
  notice.value = m;
  setTimeout(() => (notice.value = ""), 2800);
}

async function tryLogin() {
  error.value = "";
  api.setPassword(pw.value);
  try {
    await api.login();
    authed.value = true;
    await refresh();
  } catch (e) {
    error.value = e.message;
  }
}
async function refresh() {
  users.value = await api.getUsers();
  if (selected.value && !users.value.some((u) => u.id === selected.value))
    selected.value = null;
  if (!selected.value && users.value.length) selected.value = users.value[0].id;
  newOrder.value = users.value.length + 1;
  await loadImages();
}
async function loadImages() {
  images.value = selected.value ? await api.getImages(selected.value) : [];
}
async function select(id) {
  selected.value = id;
  editingUser.value = false;
  await loadImages();
}

function startEdit() {
  if (!selectedUser.value) return;
  editName.value = selectedUser.value.name;
  editColor.value = selectedUser.value.color;
  editIcon.value = selectedUser.value.icon || "fa-solid fa-user";
  editOrder.value = selectedUser.value.sort_order ?? 1;
  editingUser.value = true;
}

async function saveEdit() {
  if (!selected.value || !editName.value.trim()) return;
  try {
    await api.updateUser(selected.value, {
      name: editName.value.trim(),
      color: editColor.value,
      icon: editIcon.value,
      sort_order: Number(editOrder.value) || 1,
    });
    editingUser.value = false;
    await refresh();
    say("Felhasználó frissítve");
  } catch (e) {
    error.value = e.message;
  }
}

async function addUser() {
  if (!newName.value.trim()) return;
  try {
    const u = await api.createUser({
      name: newName.value.trim(),
      color: newColor.value,
      icon: newIcon.value,
      sort_order: newOrder.value ? Number(newOrder.value) : undefined,
    });
    newName.value = "";
    selected.value = u.id;
    showNewUser.value = false;
    await refresh();
    say("Felhasználó létrehozva");
  } catch (e) {
    error.value = e.message;
  }
}
async function removeUser(u) {
  if (!confirm(`Törlöd ${u.name} felhasználót és az összes képét?`)) return;
  await api.deleteUser(u.id);
  await refresh();
  say("Felhasználó törölve");
}
async function moveUser(index, dir) {
  const targetIdx = index + dir;
  if (targetIdx < 0 || targetIdx >= users.value.length) return;
  const list = [...users.value];
  const [moved] = list.splice(index, 1);
  list.splice(targetIdx, 0, moved);
  try {
    await api.reorderUsers(list.map((u) => u.id));
    await refresh();
    say("Sorrend frissítve");
  } catch (e) {
    error.value = e.message;
  }
}
async function upload(files) {
  const list = [...files].filter((f) => f.type.startsWith("image/"));
  if (!list.length || !selected.value) return;
  busy.value = true;
  try {
    for (let i = 0; i < list.length; i += 10)
      await api.uploadImages(selected.value, list.slice(i, i + 10));
    await refresh();
    say(`${list.length} kép feltöltve`);
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
function onDrop(e) {
  dragging.value = false;
  upload(e.dataTransfer.files);
}
async function removeImage(im) {
  await api.deleteImage(im.id);
  await refresh();
  say("Kép törölve");
}

onMounted(async () => {
  if (api.hasPassword()) {
    try {
      await api.login();
      authed.value = true;
      await refresh();
    } catch {}
  }
});
</script>

<template>
  <main class="dash">
    <header>
      <router-link to="/" class="btn ghost"
        ><i class="fa-solid fa-arrow-left"></i> Profilok</router-link
      >
      <h1>Vezérlőpult</h1>
    </header>

    <form v-if="!authed" class="login" @submit.prevent="tryLogin">
      <label for="pw">Admin jelszó</label>
      <input id="pw" v-model="pw" type="password" autofocus />
      <button class="btn"><i class="fa-solid fa-lock-open"></i> Belépés</button>
      <p v-if="error" class="err">{{ error }}</p>
    </form>

    <div v-else class="layout">
      <aside>
        <div class="aside-header">
          <h2>Felhasználók</h2>
        </div>

        <ul v-if="users.length">
          <li v-for="(u, idx) in users" :key="u.id" :class="{ on: u.id === selected }">
            <div class="order-arrows">
              <button
                type="button"
                class="order-btn"
                :disabled="idx === 0"
                @click.stop="moveUser(idx, -1)"
                :aria-label="u.name + ' előrébb mozgatása'"
                title="Előrébb mozgatás"
              >
                <i class="fa-solid fa-chevron-up"></i>
              </button>
              <button
                type="button"
                class="order-btn"
                :disabled="idx === users.length - 1"
                @click.stop="moveUser(idx, 1)"
                :aria-label="u.name + ' hátrébb mozgatása'"
                title="Hátrébb mozgatás"
              >
                <i class="fa-solid fa-chevron-down"></i>
              </button>
            </div>
            <button class="pick" @click="select(u.id)">
              <span class="dot" :style="{ background: u.color }">
                <i v-if="u.icon" :class="u.icon"></i>
                <span v-else>{{ u.name.charAt(0).toUpperCase() }}</span>
              </span>
              <span class="pick-text">
                <span class="pick-name">
                  <span class="order-tag">#{{ u.sort_order }}</span>
                  {{ u.name }}
                </span>
                <small>{{ u.count }} kép</small>
              </span>
            </button>
            <button
              class="icon"
              @click="removeUser(u)"
              :aria-label="u.name + ' törlése'"
              title="Törlés"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </li>
        </ul>
        <p v-else class="muted no-users">Még nincs felhasználó.</p>

        <!-- Toggle Button to Open New User Form -->
        <button
          v-if="!showNewUser"
          type="button"
          class="btn ghost add-user-btn"
          @click="showNewUser = true"
        >
          <i class="fa-solid fa-user-plus"></i> Új felhasználó
        </button>

        <!-- Collapsible Form -->
        <form v-else class="new" @submit.prevent="addUser">
          <div class="new-header">
            <h4><i class="fa-solid fa-user-plus"></i> Új felhasználó</h4>
            <button
              type="button"
              class="btn ghost sm icon-close"
              @click="showNewUser = false"
              aria-label="Mégse"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="preview-avatar" :style="{ background: newColor }">
            <i :class="newIcon"></i>
          </div>
          <div class="form-row">
            <input
              v-model="newName"
              placeholder="Új felhasználó neve"
              aria-label="Új felhasználó neve"
              autofocus
            />
            <div class="order-field">
              <label for="new-order">Sorrend:</label>
              <input
                id="new-order"
                v-model.number="newOrder"
                type="number"
                min="1"
                placeholder="Szám"
                aria-label="Sorrend száma"
              />
            </div>
          </div>
          <ColorPicker v-model="newColor" />
          <IconPicker v-model="newIcon" />
          <div class="new-actions">
            <button
              type="button"
              class="btn ghost sm"
              @click="showNewUser = false"
            >
              Mégse
            </button>
            <button class="btn sm">
              <i class="fa-solid fa-check"></i> Létrehozás
            </button>
          </div>
        </form>
        <p v-if="error" class="err">{{ error }}</p>
      </aside>

      <section v-if="selected">
        <div class="user-card" v-if="selectedUser">
          <div v-if="!editingUser" class="user-header">
            <div class="user-info">
              <span
                class="dot large"
                :style="{ background: selectedUser.color }"
              >
                <i v-if="selectedUser.icon" :class="selectedUser.icon"></i>
                <span v-else>{{
                  selectedUser.name.charAt(0).toUpperCase()
                }}</span>
              </span>
              <div>
                <h3>
                  <span class="order-badge">#{{ selectedUser.sort_order }}</span>
                  {{ selectedUser.name }}
                </h3>
                <span class="muted">{{ images.length }} kép · Sorrend: {{ selectedUser.sort_order }}.</span>
              </div>
            </div>
            <button type="button" class="btn ghost sm" @click="startEdit">
              <i class="fa-solid fa-pen"></i> Szerkesztés
            </button>
          </div>
          <div v-else class="edit-box">
            <div class="edit-header">
              <h4>Profil szerkesztése</h4>
              <button
                type="button"
                class="btn ghost sm"
                @click="editingUser = false"
              >
                <i class="fa-solid fa-xmark"></i> Mégse
              </button>
            </div>
            <div class="edit-preview">
              <span class="dot large" :style="{ background: editColor }">
                <i :class="editIcon"></i>
              </span>
              <div class="edit-inputs">
                <input v-model="editName" placeholder="Név" aria-label="Név" />
                <div class="order-field">
                  <label for="edit-order">Sorrend:</label>
                  <input
                    id="edit-order"
                    v-model.number="editOrder"
                    type="number"
                    min="1"
                    placeholder="Szám"
                    aria-label="Sorrend száma"
                  />
                </div>
              </div>
              <button class="btn sm" @click="saveEdit">
                <i class="fa-solid fa-check"></i> Mentés
              </button>
            </div>
            <ColorPicker v-model="editColor" />
            <IconPicker v-model="editIcon" />
          </div>
        </div>

        <label
          class="drop"
          :class="{ over: dragging }"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
        >
          <i
            :class="
              busy
                ? 'fa-solid fa-spinner fa-spin'
                : 'fa-solid fa-cloud-arrow-up'
            "
          ></i>
          <strong>{{
            busy
              ? "Feltöltés…"
              : "Húzd ide a képeket, vagy kattints a tallózáshoz"
          }}</strong>
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            @change="
              upload($event.target.files);
              $event.target.value = '';
            "
          />
        </label>
        <p v-if="!images.length" class="muted">
          Még nincs kép ennél a felhasználónál.
        </p>
        <ul class="thumbs">
          <li v-for="im in images" :key="im.id">
            <img :src="im.url" alt="" loading="lazy" />
            <button @click="removeImage(im)" aria-label="Kép törlése">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </li>
        </ul>
      </section>
      <section v-else class="muted">
        Hozz létre egy felhasználót a kezdéshez.
      </section>
    </div>
    <div v-if="notice" class="toast" role="status">
      <i class="fa-solid fa-check"></i> {{ notice }}
    </div>
  </main>
</template>

<style scoped>
.dash {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}
header {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1.5rem;
}
h1 {
  font-size: 1.6rem;
  font-weight: 600;
}
h2 {
  font-size: 1rem;
  color: var(--muted);
  font-weight: 600;
  margin: 0;
}
.aside-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}
.add-user-btn {
  width: 100%;
  justify-content: center;
  margin-top: 0.4rem;
  border-style: dashed;
}
.no-users {
  font-size: 0.85rem;
  margin-bottom: 0.8rem;
}
.login {
  max-width: 320px;
  margin: 4rem auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
input:not([type="file"]) {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0.65rem 0.8rem;
  width: 100%;
}
.err {
  color: #ff7b6b;
  font-size: 0.9rem;
}
.muted {
  color: var(--muted);
}
.layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
}
@media (max-width: 800px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
aside ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.8rem;
}
aside li {
  display: flex;
  align-items: center;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}
aside li.on {
  background: var(--panel);
  border-color: var(--line);
}
.order-arrows {
  display: flex;
  flex-direction: column;
  padding-left: 0.35rem;
  gap: 1px;
}
.order-btn {
  background: none;
  border: 0;
  color: var(--muted);
  padding: 0.2rem 0.25rem;
  font-size: 0.7rem;
  cursor: pointer;
  line-height: 1;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.order-btn:hover:not(:disabled) {
  color: var(--text);
  background: rgba(255, 255, 255, 0.12);
}
.order-btn:disabled {
  opacity: 0.18;
  cursor: default;
}
.pick {
  flex: 1;
  background: none;
  border: 0;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.4rem;
  text-align: left;
  min-width: 0;
}
.pick-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.pick-name {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.08);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  flex-shrink: 0;
}
.order-badge {
  display: inline-block;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent);
  background: rgba(242, 180, 65, 0.15);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  vertical-align: middle;
  margin-right: 0.35rem;
}
.pick small {
  display: block;
  color: var(--muted);
  font-size: 0.78rem;
}
.dot {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #fff;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.dot.large {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  font-size: 1.6rem;
}
.icon {
  background: none;
  border: 0;
  color: var(--muted);
  padding: 0.6rem;
}
.icon:hover {
  color: #ff7b6b;
}
.new {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  border-top: 1px solid var(--line);
  padding-top: 1rem;
  margin-top: 0.6rem;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.new-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.new-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.form-row {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}
.form-row input:first-child {
  flex: 1;
}
.order-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: var(--muted);
  flex-shrink: 0;
}
.order-field input {
  width: 65px !important;
  text-align: center;
  padding: 0.65rem 0.4rem;
}
.new-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.icon-close {
  padding: 0.3rem 0.6rem;
}
.preview-avatar {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  color: #fff;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.user-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.9rem 1.1rem;
  margin-bottom: 1.2rem;
}
.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.user-info h3 {
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
}
.btn.sm {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
}
.edit-box {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.edit-preview {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.edit-inputs {
  display: flex;
  flex: 1;
  gap: 0.6rem;
  align-items: center;
}
.edit-inputs input:first-child {
  flex: 1;
}
.drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 2rem 1rem;
  border: 2px dashed var(--line);
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 1.5rem;
  text-align: center;
  transition:
    border-color 0.2s,
    background 0.2s;
}
.drop i {
  font-size: 2rem;
  color: var(--accent);
}
.drop:hover,
.drop.over {
  border-color: var(--accent);
  background: var(--panel);
}
.thumbs {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.6rem;
}
.thumbs li {
  position: relative;
  aspect-ratio: 4/3;
  border-radius: 6px;
  overflow: hidden;
  background: var(--panel);
}
.thumbs img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumbs button {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s;
}
.thumbs li:hover button,
.thumbs button:focus-visible {
  opacity: 1;
}
.toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent);
  color: #1a1405;
  padding: 0.6rem 1.1rem;
  border-radius: 6px;
  font-weight: 600;
}
</style>
