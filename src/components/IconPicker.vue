<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "fa-solid fa-user",
  },
});

const emit = defineEmits(["update:modelValue"]);

const isCustom = ref(false);
const customInput = ref(props.modelValue || "fa-solid fa-user");
const searchQuery = ref("");
const selectedCategory = ref("all");

const categories = [
  { id: "all", name: "Mind" },
  { id: "people", name: "Emberek" },
  { id: "nature", name: "Állatok & Természet" },
  { id: "hobby", name: "Hobbi & Média" },
  { id: "objects", name: "Tárgyak & Utazás" },
  { id: "symbols", name: "Szimbólumok" },
];

const iconsList = [
  // People & Faces
  {
    id: "fa-solid fa-user",
    tags: "user ember felhasznalo profil",
    category: "people",
  },
  {
    id: "fa-solid fa-user-astronaut",
    tags: "astronaut urhajos space ur",
    category: "people",
  },
  { id: "fa-solid fa-user-ninja", tags: "ninja harcos", category: "people" },
  {
    id: "fa-solid fa-user-secret",
    tags: "secret kem nyomozo detektiv spy",
    category: "people",
  },
  {
    id: "fa-solid fa-face-smile",
    tags: "smile mosoly boldog happy face arc",
    category: "people",
  },
  {
    id: "fa-solid fa-face-laugh-beam",
    tags: "laugh nevetes vidam",
    category: "people",
  },
  {
    id: "fa-solid fa-face-grin-stars",
    tags: "stars csillagszem grin",
    category: "people",
  },
  {
    id: "fa-solid fa-face-smile-wink",
    tags: "wink kacsintas",
    category: "people",
  },
  { id: "fa-solid fa-robot", tags: "robot gep bot ai", category: "people" },
  {
    id: "fa-solid fa-child",
    tags: "child gyerek kid baba",
    category: "people",
  },
  {
    id: "fa-solid fa-skull",
    tags: "skull koponya skeleton",
    category: "people",
  },

  // Nature & Animals
  {
    id: "fa-solid fa-cat",
    tags: "cat cica macska kitten pet allat",
    category: "nature",
  },
  {
    id: "fa-solid fa-dog",
    tags: "dog kutya kutyus puppy pet allat",
    category: "nature",
  },
  { id: "fa-solid fa-paw", tags: "paw mancs tappancs pet", category: "nature" },
  {
    id: "fa-solid fa-dragon",
    tags: "dragon sarkany fantasy",
    category: "nature",
  },
  { id: "fa-solid fa-fish", tags: "fish hal vizi tenger", category: "nature" },
  {
    id: "fa-solid fa-dove",
    tags: "dove galamb madar bird beke",
    category: "nature",
  },
  {
    id: "fa-solid fa-crow",
    tags: "crow hollo varju madar bird",
    category: "nature",
  },
  { id: "fa-solid fa-frog", tags: "frog beka nature", category: "nature" },
  { id: "fa-solid fa-spider", tags: "spider pok insect", category: "nature" },
  { id: "fa-solid fa-horse", tags: "horse lo poney lovas", category: "nature" },
  { id: "fa-solid fa-hippo", tags: "hippo vizilo", category: "nature" },
  { id: "fa-solid fa-otter", tags: "otter vidra", category: "nature" },
  {
    id: "fa-solid fa-feather",
    tags: "feather toll madartoll",
    category: "nature",
  },
  { id: "fa-solid fa-tree", tags: "tree fa erdo noveny", category: "nature" },
  {
    id: "fa-solid fa-seedling",
    tags: "seedling hajtas noveny virag plant",
    category: "nature",
  },
  {
    id: "fa-solid fa-leaf",
    tags: "leaf falevel termeszet",
    category: "nature",
  },
  { id: "fa-solid fa-cannabis", tags: "cannabis level fu", category: "nature" },
  { id: "fa-solid fa-sun", tags: "sun nap napocska meleg", category: "nature" },
  {
    id: "fa-solid fa-moon",
    tags: "moon hold ejszaka night",
    category: "nature",
  },
  {
    id: "fa-solid fa-cloud",
    tags: "cloud felho weather ido",
    category: "nature",
  },
  {
    id: "fa-solid fa-snowflake",
    tags: "snowflake hohohohopelyhely ho tel",
    category: "nature",
  },
  {
    id: "fa-solid fa-fire",
    tags: "fire tuz lang hot meleg",
    category: "nature",
  },
  {
    id: "fa-solid fa-water",
    tags: "water viz hullam wave tenger ocean",
    category: "nature",
  },

  // Hobby & Media
  {
    id: "fa-solid fa-gamepad",
    tags: "gamepad jatek kontroller gamer play konzol",
    category: "hobby",
  },
  {
    id: "fa-solid fa-dice",
    tags: "dice kocka tarsasjatek roll",
    category: "hobby",
  },
  {
    id: "fa-solid fa-chess-knight",
    tags: "chess sakk lo knight jatek",
    category: "hobby",
  },
  {
    id: "fa-solid fa-puzzle-piece",
    tags: "puzzle kirako jatek darab",
    category: "hobby",
  },
  {
    id: "fa-solid fa-music",
    tags: "music zene kotta song dal",
    category: "hobby",
  },
  {
    id: "fa-solid fa-headphones",
    tags: "headphones fulhallgato zene hang",
    category: "hobby",
  },
  {
    id: "fa-solid fa-guitar",
    tags: "guitar gitar hangszer rock",
    category: "hobby",
  },
  {
    id: "fa-solid fa-microphone",
    tags: "microphone mikrofon enek podcast",
    category: "hobby",
  },
  {
    id: "fa-solid fa-palette",
    tags: "palette paletta festes rajz muveszet art",
    category: "hobby",
  },
  {
    id: "fa-solid fa-camera",
    tags: "camera fenykepezo foto kep",
    category: "hobby",
  },
  {
    id: "fa-solid fa-film",
    tags: "film mozi video mozgokep",
    category: "hobby",
  },
  {
    id: "fa-solid fa-clapperboard",
    tags: "clapperboard film mozi clap video",
    category: "hobby",
  },
  {
    id: "fa-solid fa-tv",
    tags: "tv televizio kepernyo monitor",
    category: "hobby",
  },
  {
    id: "fa-solid fa-book",
    tags: "book konyv olvasas tanulas",
    category: "hobby",
  },
  {
    id: "fa-solid fa-book-open",
    tags: "book open nyitott konyv",
    category: "hobby",
  },
  {
    id: "fa-solid fa-futbol",
    tags: "futbol foci futball labda sport ball",
    category: "hobby",
  },
  {
    id: "fa-solid fa-basketball",
    tags: "basketball kosarlabda sport",
    category: "hobby",
  },
  {
    id: "fa-solid fa-trophy",
    tags: "trophy kupa serleg gyoztes winner",
    category: "hobby",
  },
  { id: "fa-solid fa-medal", tags: "medal erem dijj sport", category: "hobby" },
  {
    id: "fa-solid fa-bicycle",
    tags: "bicycle kerekpar bicikli sport utazas",
    category: "hobby",
  },

  // Objects & Travel
  {
    id: "fa-solid fa-car",
    tags: "car auto kocsi jarmu vezetes",
    category: "objects",
  },
  {
    id: "fa-solid fa-plane",
    tags: "plane repulo repulogep repules flight",
    category: "objects",
  },
  {
    id: "fa-solid fa-rocket",
    tags: "rocket raketa kiloves space ur",
    category: "objects",
  },
  {
    id: "fa-solid fa-sailboat",
    tags: "sailboat hajo vitorlas tenger boat",
    category: "objects",
  },
  {
    id: "fa-solid fa-motorcycle",
    tags: "motorcycle motor motorbicikli",
    category: "objects",
  },
  {
    id: "fa-solid fa-truck",
    tags: "truck teherauto kamion",
    category: "objects",
  },
  {
    id: "fa-solid fa-train",
    tags: "train vonat vasut utazas",
    category: "objects",
  },
  {
    id: "fa-solid fa-compass",
    tags: "compass iranytu terkep tajolodas",
    category: "objects",
  },
  {
    id: "fa-solid fa-earth-americas",
    tags: "earth fold bolygo vilagterkep world globe",
    category: "objects",
  },
  {
    id: "fa-solid fa-house",
    tags: "house haz otthon home epulet",
    category: "objects",
  },
  {
    id: "fa-solid fa-mug-hot",
    tags: "mug coffee kave tea bogre forro hot",
    category: "objects",
  },
  {
    id: "fa-solid fa-pizza-slice",
    tags: "pizza etel food vacsora szelet",
    category: "objects",
  },
  {
    id: "fa-solid fa-burger",
    tags: "burger hamburger etel food gyorsetel",
    category: "objects",
  },
  {
    id: "fa-solid fa-ice-cream",
    tags: "ice-cream fagylalt fagyis edesseg",
    category: "objects",
  },
  {
    id: "fa-solid fa-cake-candles",
    tags: "cake torta szuletesnap unneples",
    category: "objects",
  },
  {
    id: "fa-solid fa-glasses",
    tags: "glasses szemuveg latas okos",
    category: "objects",
  },
  {
    id: "fa-solid fa-hat-wizard",
    tags: "wizard varazslo kalap magic",
    category: "objects",
  },
  {
    id: "fa-solid fa-shirt",
    tags: "shirt polo ruha oltozet",
    category: "objects",
  },
  {
    id: "fa-solid fa-gem",
    tags: "gem dragako gyemant kristaly diamond",
    category: "objects",
  },
  { id: "fa-solid fa-key", tags: "key kulcs zart unlock", category: "objects" },
  { id: "fa-solid fa-lock", tags: "lock lakat biztonsag", category: "objects" },
  {
    id: "fa-solid fa-umbrella",
    tags: "umbrella esernylo eso rain",
    category: "objects",
  },
  {
    id: "fa-solid fa-lightbulb",
    tags: "lightbulb egokorte villanykorte otlet idea",
    category: "objects",
  },

  // Symbols & Special
  {
    id: "fa-solid fa-heart",
    tags: "heart sziv szerelem love kedvenc",
    category: "symbols",
  },
  {
    id: "fa-solid fa-star",
    tags: "star csillag kedvenc ertekeles",
    category: "symbols",
  },
  {
    id: "fa-solid fa-crown",
    tags: "crown korona kiraly king queen",
    category: "symbols",
  },
  {
    id: "fa-solid fa-bolt",
    tags: "bolt villam energia electric villamlas",
    category: "symbols",
  },
  {
    id: "fa-solid fa-ghost",
    tags: "ghost szellem boo halloween ijeszto",
    category: "symbols",
  },
  {
    id: "fa-solid fa-wand-magic-sparkles",
    tags: "wand varazspalca magic csoda varazslat sparkles",
    category: "symbols",
  },
  {
    id: "fa-solid fa-shield",
    tags: "shield pajzs vedelem hero",
    category: "symbols",
  },
  {
    id: "fa-solid fa-gift",
    tags: "gift ajandek csomag meglepetes",
    category: "symbols",
  },
  {
    id: "fa-solid fa-bell",
    tags: "bell csengo ertesites",
    category: "symbols",
  },
  {
    id: "fa-solid fa-certificate",
    tags: "certificate oklevel tanusitvany jelveny",
    category: "symbols",
  },
  {
    id: "fa-solid fa-award",
    tags: "award kituntetes dijj",
    category: "symbols",
  },
  {
    id: "fa-solid fa-thumbs-up",
    tags: "thumbs up like tetszik jo",
    category: "symbols",
  },
  { id: "fa-solid fa-peace", tags: "peace beke sign jel", category: "symbols" },
  {
    id: "fa-solid fa-infinity",
    tags: "infinity vegtelen szimbolum",
    category: "symbols",
  },
  {
    id: "fa-solid fa-anchor",
    tags: "anchor horgony tengeresz tenger",
    category: "symbols",
  },
  {
    id: "fa-solid fa-code",
    tags: "code kod programozas dev fejleszto",
    category: "symbols",
  },
  {
    id: "fa-solid fa-terminal",
    tags: "terminal parancssor konzol cli",
    category: "symbols",
  },
];

// Check if current value exists in predefined list
const isInCatalog = computed(() =>
  iconsList.some((ic) => ic.id === props.modelValue),
);

// If modelValue is not in catalog on mount, default to custom mode
if (!isInCatalog.value && props.modelValue) {
  isCustom.value = true;
}

watch(
  () => props.modelValue,
  (val) => {
    if (val && val !== customInput.value) {
      customInput.value = val;
    }
  },
);

const filteredIcons = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return iconsList.filter((item) => {
    const matchesCategory =
      selectedCategory.value === "all" ||
      item.category === selectedCategory.value;
    if (!matchesCategory) return false;

    if (!q) return true;
    const cleanId = item.id.replace("fa-solid fa-", "").replace("fa-", "");
    return item.tags.toLowerCase().includes(q) || cleanId.includes(q);
  });
});

function selectIcon(iconId) {
  customInput.value = iconId;
  emit("update:modelValue", iconId);
}

function onCustomInput(e) {
  let val = e.target.value.trim();
  customInput.value = val;
  if (!val) {
    emit("update:modelValue", "");
    return;
  }
  // Smart prefixing: if user typed e.g. "dragon" or "fa-dragon", normalize it
  let formatted = val;
  if (!formatted.startsWith("fa-")) {
    formatted = "fa-solid fa-" + formatted;
  } else if (
    !formatted.includes("fa-solid") &&
    !formatted.includes("fa-regular") &&
    !formatted.includes("fa-brands")
  ) {
    formatted = "fa-solid " + formatted;
  }
  emit("update:modelValue", formatted);
}

function quickSetCustom(val) {
  customInput.value = val;
  emit("update:modelValue", val);
}
</script>

<template>
  <div class="icon-picker-wrap">
    <div class="picker-top">
      <span class="picker-label"> <i class="fa-solid fa-icons"></i> Ikon </span>
      <div class="mode-switch">
        <button
          type="button"
          class="switch-btn"
          :class="{ active: !isCustom }"
          @click="isCustom = false"
        >
          Katalógus
        </button>
        <button
          type="button"
          class="switch-btn"
          :class="{ active: isCustom }"
          @click="isCustom = true"
        >
          Egyéni FA ID
        </button>
      </div>
    </div>

    <!-- Catalog View -->
    <div v-if="!isCustom" class="catalog-view">
      <!-- Search & Category Filters -->
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Keresés (pl. cica, zene, gamer)..."
          class="search-input"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="clear-search"
          @click="searchQuery = ''"
          aria-label="Keresés törlése"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="category-pills">
        <button
          type="button"
          v-for="cat in categories"
          :key="cat.id"
          class="pill-btn"
          :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- Icon Grid -->
      <div class="icon-grid" role="grid">
        <button
          type="button"
          v-for="ic in filteredIcons"
          :key="ic.id"
          class="icon-btn"
          :class="{ sel: ic.id === modelValue }"
          :title="ic.id.replace('fa-solid fa-', '')"
          :aria-label="ic.id"
          @click="selectIcon(ic.id)"
        >
          <i :class="ic.id"></i>
        </button>
      </div>
      <div v-if="!filteredIcons.length" class="no-results">
        Nincs találat a keresésre. Próbálj másik kulcsszót vagy válts egyéni FA
        ID módra!
      </div>
    </div>

    <!-- Custom FA ID View -->
    <div v-else class="custom-fa-view">
      <div class="custom-input-row">
        <div class="preview-box">
          <i v-if="modelValue" :class="modelValue"></i>
          <span v-else class="empty-preview">-</span>
        </div>
        <div class="input-field">
          <input
            type="text"
            :value="customInput"
            placeholder="pl. fa-solid fa-dragon vagy fa-brands fa-github"
            spellcheck="false"
            @input="onCustomInput"
          />
        </div>
      </div>
      <div class="quick-examples">
        <span class="ex-label">Gyors példák:</span>
        <div class="pill-list">
          <button
            type="button"
            class="example-pill"
            @click="quickSetCustom('fa-solid fa-wand-magic-sparkles')"
          >
            <i class="fa-solid fa-wand-magic-sparkles"></i> varázspálca
          </button>
          <button
            type="button"
            class="example-pill"
            @click="quickSetCustom('fa-brands fa-github')"
          >
            <i class="fa-brands fa-github"></i> github
          </button>
          <button
            type="button"
            class="example-pill"
            @click="quickSetCustom('fa-brands fa-spotify')"
          >
            <i class="fa-brands fa-spotify"></i> spotify
          </button>
          <button
            type="button"
            class="example-pill"
            @click="quickSetCustom('fa-solid fa-mug-hot')"
          >
            <i class="fa-solid fa-mug-hot"></i> kávé
          </button>
        </div>
      </div>
      <small class="hint">
        Tetszőleges FontAwesome 6 ikon azonosítója megadható (pl.
        <code>fa-solid fa-code</code>,
        <code>fa-regular fa-face-smile</code> vagy
        <code>fa-brands fa-playstation</code>).
      </small>
    </div>
  </div>
</template>

<style scoped>
.icon-picker-wrap {
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

.catalog-view {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.6rem;
  font-size: 0.78rem;
  color: var(--muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.35rem 1.8rem 0.35rem 1.9rem;
  font-size: 0.82rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text);
}

.clear-search {
  position: absolute;
  right: 0.4rem;
  background: none;
  border: 0;
  color: var(--muted);
  padding: 0.2rem;
  font-size: 0.75rem;
}

.clear-search:hover {
  color: var(--text);
}

.category-pills {
  display: flex;
  gap: 0.3rem;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
}

.pill-btn {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  white-space: nowrap;
  color: var(--muted);
  transition: all 0.15s ease;
}

.pill-btn:hover {
  color: var(--text);
  border-color: var(--muted);
}

.pill-btn.active {
  background: rgba(242, 180, 65, 0.15);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
  max-height: 140px;
  overflow-y: auto;
  padding: 2px;
  scrollbar-width: thin;
}

.icon-btn {
  aspect-ratio: 1;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--muted);
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s,
    transform 0.12s;
  padding: 0;
}

.icon-btn:hover {
  color: var(--text);
  border-color: var(--muted);
  transform: scale(1.08);
}

.icon-btn.sel {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(242, 180, 65, 0.2);
  box-shadow: 0 0 5px rgba(242, 180, 65, 0.3);
}

.no-results {
  font-size: 0.75rem;
  color: var(--muted);
  text-align: center;
  padding: 0.75rem 0.2rem;
}

.custom-fa-view {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.custom-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-box {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--panel);
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  color: var(--accent);
  flex-shrink: 0;
}

.empty-preview {
  color: var(--muted);
}

.input-field {
  flex: 1;
}

.input-field input {
  font-family: monospace;
  font-size: 0.85rem;
  padding: 0.45rem 0.65rem;
  border-radius: 6px;
  background: var(--panel);
  border: 1px solid var(--line);
  width: 100%;
}

.quick-examples {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ex-label {
  font-size: 0.72rem;
  color: var(--muted);
}

.pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.example-pill {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--muted);
  transition: all 0.15s ease;
}

.example-pill:hover {
  color: var(--text);
  border-color: var(--accent);
}

.hint {
  font-size: 0.72rem;
  color: var(--muted);
  line-height: 1.3;
}

.hint code {
  background: rgba(255, 255, 255, 0.08);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-family: monospace;
}
</style>
