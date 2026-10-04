import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./style.css";
import App from "./App.vue";
import Profiles from "./views/Profiles.vue";
import Slideshow from "./views/Slideshow.vue";
import Dashboard from "./views/Dashboard.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Profiles },
    { path: "/show/:id", component: Slideshow },
    { path: "/dashboard", component: Dashboard },
  ],
});
createApp(App).use(router).mount("#app");
