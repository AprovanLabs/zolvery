import Router from '@koa/router';

export const buildGamesRouter = () => {
    const router = new Router();
    
    router.get('/:gameId', () => {});

    return router;
}
