<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getUsers } from "../api";

const users = ref([]);
const loaded = ref(false);
const router = useRouter();
onMounted(async () => {
  users.value = await getUsers();
  loaded.value = true;
});
const initial = (n) => n.trim().charAt(0).toUpperCase();
</script>

<template>
  <main class="who">
    <h1>Ki nézi most?</h1>
    <ul v-if="users.length" class="grid">
      <li v-for="u in users" :key="u.id">
        <button
          class="profile"
          @click="router.push('/show/' + u.id)"
          :aria-label="u.name + ' diavetítésének indítása'"
        >
          <span class="avatar" :style="{ background: u.color }">
            <i v-if="u.icon" :class="u.icon"></i>
            <span v-else>{{ initial(u.name) }}</span>
          </span>
          <span class="name">{{ u.name }}</span>
          <span class="count"
            ><i class="fa-regular fa-images"></i> {{ u.count }} kép</span
          >
        </button>
      </li>
    </ul>
    <p v-else-if="loaded" class="empty">
      Még nincs senki. Hozz létre egy felhasználót a vezérlőpulton.
    </p>
    <router-link to="/dashboard" class="btn ghost manage"
      ><i class="fa-solid fa-gear"></i> Vezérlőpult</router-link
    >
  </main>
</template>

<style scoped>
.who {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  padding: 2rem;
}
h1 {
  font-size: clamp(2rem, 5vw, 3.4rem);
  font-weight: 500;
  letter-spacing: -0.01em;
}
.grid {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: clamp(1rem, 3vw, 2.2rem);
  justify-content: center;
  max-width: 1000px;
}
.profile {
  background: none;
  border: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  width: clamp(110px, 18vw, 170px);
}
.avatar {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: clamp(2.6rem, 7vw, 4.5rem);
  font-weight: 700;
  color: #fff;
  border: 3px solid transparent;
  transition:
    transform 0.2s,
    border-color 0.2s;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
.name {
  color: var(--muted);
  font-size: 1.15rem;
  transition: color 0.2s;
}
.count {
  color: var(--muted);
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.2s;
}
.profile:hover .avatar,
.profile:focus-visible .avatar {
  border-color: var(--text);
  transform: scale(1.06);
}
.profile:hover .name,
.profile:focus-visible .name {
  color: var(--text);
}
.profile:hover .count,
.profile:focus-visible .count {
  opacity: 1;
}
.empty {
  color: var(--muted);
}
.manage {
  letter-spacing: 0.02em;
}
</style>
