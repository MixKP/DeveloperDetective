import { createRouter, createWebHistory } from 'vue-router';
import type { Stage } from '@dd/shared';
import { stageOrder, stageReachable } from '@/design/theme';
import { useAuthStore } from '@/stores/auth';
import { useScenariosStore } from '@/stores/scenarios';
import DashboardView from '@/views/DashboardView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/auth', name: 'auth', component: () => import('@/views/AuthView.vue') },
    {
      path: '/cases/:id(\\d+)',
      component: () => import('@/views/CaseLayout.vue'),
      children: [
        { path: '', redirect: (to) => ({ name: 'brief', params: to.params }) },
        { path: 'brief', name: 'brief', component: () => import('@/views/BriefView.vue') },
        {
          path: 'investigate',
          name: 'investigate',
          component: () => import('@/views/InvestigateView.vue'),
        },
        { path: 'quiz', name: 'quiz', component: () => import('@/views/QuizView.vue') },
        { path: 'debrief', name: 'debrief', component: () => import('@/views/DebriefView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

const isStage = (name: unknown): name is Stage =>
  typeof name === 'string' && stageOrder.includes(name as Stage);

/**
 * Every route but `/auth` needs an account. A build with no Supabase credentials
 * has no way to sign anyone in, so it stays on the anonymous identifier instead of
 * locking the app behind a door it cannot open — that is the local and CI case,
 * never a deployment that configured auth.
 */
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.init();
  if (!auth.authEnabled) return true;
  if (to.name === 'auth' || auth.signedIn) return true;
  return { name: 'auth' };
});

router.beforeEach(async (to) => {
  if (!isStage(to.name)) return true;

  const scenarioId = Number(to.params.id);
  const scenarios = useScenariosStore();

  try {
    await scenarios.fetchDetail(scenarioId);
  } catch {
    return { name: 'dashboard' };
  }

  if (!stageReachable(to.name, scenarios.current?.state.quizComplete === true)) {
    return { name: 'quiz', params: { id: scenarioId } };
  }
  return true;
});

export default router;
