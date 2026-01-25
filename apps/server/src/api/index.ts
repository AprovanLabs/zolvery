import Router from '@koa/router';
import { authMiddleware } from '@/middleware/auth';
import { router as authRouter } from './v1/auth';
import { buildAppRouter } from './v1/app';
import { buildGamesRouter } from './v1/games';
import { Services } from '@/services';

export const buildApiRouter = (deps: { services: Services }) => {
  const router = new Router();

  router.use('/v1/auth', authRouter.routes());
  router.use('/v1/apps', buildAppRouter(deps).routes());
  router.use('/v1/games', authMiddleware, buildGamesRouter().routes());

  return router;
};
