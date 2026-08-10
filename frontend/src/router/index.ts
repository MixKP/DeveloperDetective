import { createRouter, createWebHistory } from 'vue-router';
import type { Stage } from '@dd/shared';
import { stageOrder, stageReachable } from '@/design/theme';
import { useScenariosStore } from '@/stores/scenarios';
import DashboardView from '@/views/DashboardView.vue';

/**
 * Routes are nested under the case so the scenario id survives a refresh at any stage.
 * The four stage routes are named after the stages themselves, which is what lets the
 * guard below treat progression generically.
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    {
      path: '/cases/:id(\\d+)',
      component: () => import('@/views/CaseLayout.vue'),
      children: [
        { path: '', redirect: (to) => ({ name: 'brief', params: to.params }) },
        { path: 'brief', name: 'brief', component: () => import('@/views/BriefView.vue') },
        {
          path: 'investigate',
          name: 'investigate',
          // Lazy on purpose: this route pulls in Monaco, which is the heaviest dependency
          // in the app and has no business loading on the dashboard.
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
 * Progression guard.
 *
 * This is UX, not security: it stops a learner wandering into the debrief before they have
 * investigated anything. The real enforcement is server-side, where gated content is simply
 * not sent. Deep-linking past your stage therefore lands you back where you actually are,
 * rather than on an empty page.
 */
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
    // Only the debrief is ever blocked, and the place to send them is the work itself.
    return { name: 'quiz', params: { id: scenarioId } };
  }
  return true;
});

export default router;
