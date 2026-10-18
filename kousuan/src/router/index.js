import { createRouter, createWebHashHistory } from 'vue-router'

export const routes = [
    {
        path: '/',
        redirect: '/home'
    },
    {
        path: '/home',
        name: 'home',
        component: () => import('../views/Layout.vue'),
    },
    {
        path: '/print',
        name: 'print',
        props: true,
        component: () => import('../views/Print.vue'),
    }
];


const baseUrl = import.meta.env.BASE_URL
// console.log(baseUrl)
export const router = createRouter({
    // 部署到子目录（如 /kousuan/）时用 hash 模式，避免需要 SPA 回退规则
    history: createWebHashHistory(baseUrl),
    // history: createWebHistory(baseUrl),
    routes,
});