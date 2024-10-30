import { createRouter, createWebHistory } from "vue-router";
import viedoCall from "../viedoCall.vue";
import voiceCall from "../voiceCall.vue";
const routes = [
    {
        path: '/',
        name: "home",
        component: viedoCall
    },
    {
        path: '/voice',
        name: "voice",
        component: voiceCall
    }
]
const router = createRouter({
    history: createWebHistory(),
    routes,
})
export default router