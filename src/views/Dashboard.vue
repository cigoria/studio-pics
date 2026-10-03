<script setup>
import { ref, computed, onMounted } from 'vue'
import * as api from '../api'

const authed = ref(false)
const pw = ref('')
const error = ref('')
const users = ref([])
const selected = ref(null)
const images = ref([])
const newName = ref('')
const newColor = ref('#e0527a')
const newIcon = ref('fa-solid fa-user')
const editingUser = ref(false)
const editName = ref('')
const editColor = ref('#e0527a')
const editIcon = ref('fa-solid fa-user')
const busy = ref(false)
const dragging = ref(false)
const notice = ref('')
const colors = ['#e0527a', '#f2b441', '#3fa7d6', '#59c9a5', '#8e6bd8', '#ee7b30', '#ef4444', '#10b981']
const icons = [
  'fa-solid fa-user',
  'fa-solid fa-face-smile',
  'fa-solid fa-heart',
  'fa-solid fa-star',
  'fa-solid fa-crown',
  'fa-solid fa-cat',
  'fa-solid fa-dog',
  'fa-solid fa-paw',
  'fa-solid fa-dragon',
  'fa-solid fa-rocket',
  'fa-solid fa-sailboat',
  'fa-solid fa-car',
  'fa-solid fa-plane',
  'fa-solid fa-camera',
  'fa-solid fa-gamepad',
  'fa-solid fa-music',
  'fa-solid fa-palette',
  'fa-solid fa-film',
  'fa-solid fa-sun',
  'fa-solid fa-moon',
  'fa-solid fa-ghost',
  'fa-solid fa-gem',
  'fa-solid fa-fire',
  'fa-solid fa-bolt'
]

const selectedUser = computed(() => users.value.find((u) => u.id === selected.value))

function say(m) { notice.value = m; setTimeout(() => (notice.value = ''), 2800) }

async function tryLogin() {
  error.value = ''
  api.setPassword(pw.value)
  try { await api.login(); authed.value = true; await refresh() }
  catch (e) { error.value = e.message }
}
async function refresh() {
  users.value = await api.getUsers()
  if (selected.value && !users.value.some((u) => u.id === selected.value)) selected.value = null
  if (!selected.value && users.value.length) selected.value = users.value[0].id
  await loadImages()
}
async function loadImages() { images.value = selected.value ? await api.getImages(selected.value) : [] }
async function select(id) { selected.value = id; editingUser.value = false; await loadImages() }

function startEdit() {
  if (!selectedUser.value) return
  editName.value = selectedUser.value.name
  editColor.value = selectedUser.value.color
  editIcon.value = selectedUser.value.icon || 'fa-solid fa-user'
  editingUser.value = true
}

async function saveEdit() {
  if (!selected.value || !editName.value.trim()) return
  try {
    await api.updateUser(selected.value, {
      name: editName.value.trim(),
      color: editColor.value,
      icon: editIcon.value
    })
    editingUser.value = false
    await refresh()
    say('Felhasználó frissítve')
  } catch (e) { error.value = e.message }
}

async function addUser() {
  if (!newName.value.trim()) return
  try {
    const u = await api.createUser({ name: newName.value, color: newColor.value, icon: newIcon.value })
    newName.value = ''; selected.value = u.id; await refresh(); say('Felhasználó létrehozva')
  } catch (e) { error.value = e.message }
}
async function removeUser(u) {
  if (!confirm(`Törlöd ${u.name} felhasználót és az összes képét?`)) return
  await api.deleteUser(u.id); await refresh(); say('Felhasználó törölve')
}
async function upload(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'))
  if (!list.length || !selected.value) return
  busy.value = true
  try {
    for (let i = 0; i < list.length; i += 10) await api.uploadImages(selected.value, list.slice(i, i + 10))
    await refresh(); say(`${list.length} kép feltöltve`)
  } catch (e) { error.value = e.message } finally { busy.value = false }
}
function onDrop(e) { dragging.value = false; upload(e.dataTransfer.files) }
async function removeImage(im) { await api.deleteImage(im.id); await refresh(); say('Kép törölve') }

onMounted(async () => {
  if (api.hasPassword()) { try { await api.login(); authed.value = true; await refresh() } catch {} }
})
</script>

<template>
  <main class="dash">
    <header>
      <router-link to="/" class="btn ghost"><i class="fa-solid fa-arrow-left"></i> Profilok</router-link>
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
        <h2>Felhasználók</h2>
        <ul>
          <li v-for="u in users" :key="u.id" :class="{ on: u.id === selected }">
            <button class="pick" @click="select(u.id)">
              <span class="dot" :style="{ background: u.color }">
                <i v-if="u.icon" :class="u.icon"></i>
                <span v-else>{{ u.name.charAt(0).toUpperCase() }}</span>
              </span>
              <span>{{ u.name }}<small>{{ u.count }} kép</small></span>
            </button>
            <button class="icon" @click="removeUser(u)" :aria-label="u.name + ' törlése'"><i class="fa-solid fa-trash"></i></button>
          </li>
        </ul>
        <form class="new" @submit.prevent="addUser">
          <div class="preview-avatar" :style="{ background: newColor }">
            <i :class="newIcon"></i>
          </div>
          <input v-model="newName" placeholder="Új felhasználó neve" aria-label="Új felhasználó neve" />
          <div class="swatches">
            <button type="button" v-for="c in colors" :key="c" :style="{ background: c }" :class="{ sel: c === newColor }" :aria-label="'Szín ' + c" @click="newColor = c"></button>
          </div>
          <div class="icon-picker">
            <button type="button" v-for="ic in icons" :key="ic" class="icon-btn" :class="{ sel: ic === newIcon }" :aria-label="ic" @click="newIcon = ic">
              <i :class="ic"></i>
            </button>
          </div>
          <button class="btn"><i class="fa-solid fa-user-plus"></i> Létrehozás</button>
        </form>
        <p v-if="error" class="err">{{ error }}</p>
      </aside>

      <section v-if="selected">
        <div class="user-card" v-if="selectedUser">
          <div v-if="!editingUser" class="user-header">
            <div class="user-info">
              <span class="dot large" :style="{ background: selectedUser.color }">
                <i v-if="selectedUser.icon" :class="selectedUser.icon"></i>
                <span v-else>{{ selectedUser.name.charAt(0).toUpperCase() }}</span>
              </span>
              <div>
                <h3>{{ selectedUser.name }}</h3>
                <span class="muted">{{ images.length }} kép</span>
              </div>
            </div>
            <button type="button" class="btn ghost sm" @click="startEdit">
              <i class="fa-solid fa-pen"></i> Szerkesztés
            </button>
          </div>
          <div v-else class="edit-box">
            <div class="edit-header">
              <h4>Profil szerkesztése</h4>
              <button type="button" class="btn ghost sm" @click="editingUser = false"><i class="fa-solid fa-xmark"></i> Mégse</button>
            </div>
            <div class="edit-preview">
              <span class="dot large" :style="{ background: editColor }">
                <i :class="editIcon"></i>
              </span>
              <input v-model="editName" placeholder="Név" aria-label="Név" />
              <button class="btn sm" @click="saveEdit"><i class="fa-solid fa-check"></i> Mentés</button>
            </div>
            <div class="swatches">
              <button type="button" v-for="c in colors" :key="c" :style="{ background: c }" :class="{ sel: c === editColor }" :aria-label="'Szín ' + c" @click="editColor = c"></button>
            </div>
            <div class="icon-picker">
              <button type="button" v-for="ic in icons" :key="ic" class="icon-btn" :class="{ sel: ic === editIcon }" :aria-label="ic" @click="editIcon = ic">
                <i :class="ic"></i>
              </button>
            </div>
          </div>
        </div>

        <label class="drop" :class="{ over: dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
          <i :class="busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-cloud-arrow-up'"></i>
          <strong>{{ busy ? 'Feltöltés…' : 'Húzd ide a képeket, vagy kattints a tallózáshoz' }}</strong>
          <input type="file" accept="image/*" multiple hidden @change="upload($event.target.files); $event.target.value = ''" />
        </label>
        <p v-if="!images.length" class="muted">Még nincs kép ennél a felhasználónál.</p>
        <ul class="thumbs">
          <li v-for="im in images" :key="im.id">
            <img :src="im.url" alt="" loading="lazy" />
            <button @click="removeImage(im)" aria-label="Kép törlése"><i class="fa-solid fa-xmark"></i></button>
          </li>
        </ul>
      </section>
      <section v-else class="muted">Hozz létre egy felhasználót a kezdéshez.</section>
    </div>
    <div v-if="notice" class="toast" role="status"><i class="fa-solid fa-check"></i> {{ notice }}</div>
  </main>
</template>

<style scoped>
.dash { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
header { display: flex; align-items: center; gap: 1.2rem; margin-bottom: 1.5rem; }
h1 { font-size: 1.6rem; font-weight: 600; } h2 { font-size: 1rem; margin-bottom: .8rem; color: var(--muted); font-weight: 600; }
.login { max-width: 320px; margin: 4rem auto; display: flex; flex-direction: column; gap: .8rem; }
input:not([type=file]) { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: .65rem .8rem; width: 100%; }
.err { color: #ff7b6b; font-size: .9rem; } .muted { color: var(--muted); }
.layout { display: grid; grid-template-columns: 310px 1fr; gap: 2rem; }
@media (max-width: 760px) { .layout { grid-template-columns: 1fr; } }
aside ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: .3rem; margin-bottom: 1.2rem; }
aside li { display: flex; align-items: center; border-radius: 8px; border: 1px solid transparent; }
aside li.on { background: var(--panel); border-color: var(--line); }
.pick { flex: 1; background: none; border: 0; display: flex; align-items: center; gap: .8rem; padding: .55rem; text-align: left; }
.pick small { display: block; color: var(--muted); font-size: .78rem; }
.dot { width: 38px; height: 38px; border-radius: 6px; display: grid; place-items: center; font-weight: 700; color: #fff; font-size: 1.1rem; flex-shrink: 0; }
.dot.large { width: 52px; height: 52px; border-radius: 8px; font-size: 1.6rem; }
.icon { background: none; border: 0; color: var(--muted); padding: .6rem; } .icon:hover { color: #ff7b6b; }
.new { display: flex; flex-direction: column; gap: .8rem; border-top: 1px solid var(--line); padding-top: 1.2rem; }
.preview-avatar { width: 48px; height: 48px; border-radius: 8px; display: grid; place-items: center; font-size: 1.5rem; color: #fff; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,.3); }
.swatches { display: flex; flex-wrap: wrap; gap: .45rem; }
.swatches button { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; }
.swatches .sel { border-color: #fff; }
.icon-picker { display: grid; grid-template-columns: repeat(6, 1fr); gap: .35rem; max-height: 125px; overflow-y: auto; padding: 2px; }
.icon-btn { aspect-ratio: 1; border-radius: 6px; border: 1px solid var(--line); background: var(--panel); color: var(--muted); display: grid; place-items: center; font-size: .95rem; transition: border-color .15s, color .15s, background .15s; }
.icon-btn:hover { color: var(--text); border-color: var(--muted); }
.icon-btn.sel { border-color: var(--accent); color: var(--accent); background: rgba(242, 180, 65, 0.15); }
.user-card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: .9rem 1.1rem; margin-bottom: 1.2rem; }
.user-header { display: flex; justify-content: space-between; align-items: center; }
.user-info { display: flex; align-items: center; gap: .9rem; }
.user-info h3 { font-size: 1.2rem; font-weight: 600; }
.btn.sm { padding: .4rem .75rem; font-size: .85rem; }
.edit-box { display: flex; flex-direction: column; gap: .8rem; }
.edit-header { display: flex; justify-content: space-between; align-items: center; }
.edit-preview { display: flex; align-items: center; gap: .7rem; }
.edit-preview input { flex: 1; }
.drop { display: flex; flex-direction: column; align-items: center; gap: .6rem; padding: 2rem 1rem; border: 2px dashed var(--line); border-radius: 10px; cursor: pointer; margin-bottom: 1.5rem; text-align: center; transition: border-color .2s, background .2s; }
.drop i { font-size: 2rem; color: var(--accent); }
.drop:hover, .drop.over { border-color: var(--accent); background: var(--panel); }
.thumbs { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .6rem; }
.thumbs li { position: relative; aspect-ratio: 4/3; border-radius: 6px; overflow: hidden; background: var(--panel); }
.thumbs img { width: 100%; height: 100%; object-fit: cover; }
.thumbs button { position: absolute; top: 6px; right: 6px; width: 28px; height: 28px; border-radius: 50%; border: 0; background: rgba(0,0,0,.7); color: #fff; opacity: 0; transition: opacity .15s; }
.thumbs li:hover button, .thumbs button:focus-visible { opacity: 1; }
.toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--accent); color: #1a1405; padding: .6rem 1.1rem; border-radius: 6px; font-weight: 600; }
</style>
