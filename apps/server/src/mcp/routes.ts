import Router from '@koa/router';
import { authMiddleware } from '@/middleware/auth';

const gameRouter = new Router();
gameRouter.get('/:gameId', () => {});

const router = new Router();

router.use(authMiddleware);
router.use('/mcp', gameRouter.routes())

export { router };
