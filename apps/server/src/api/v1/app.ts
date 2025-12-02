import Router from '@koa/router';
import { logger } from '@/logger';
import { authMiddleware } from '@/middleware/auth';
import { sendErrorResponse, sendSuccessResponse } from '../responses';
import { AuthContext } from '@/auth';
import { Services } from '@/services';
import { NotFoundError, UnauthorizedError } from '@/domains/common/errors';


export const buildAppRouter = ({
    services
}: {
    services: Services
}) => {
    const router = new Router();
    
    router.use(authMiddleware);

    router.get('/:appId+', async (ctx: AuthContext) => {
        logger.info('Fetching app by ID', { appId: ctx.params.appId });
        const { appId } = ctx.params;

        try {
            const userId = ctx.user.userId;
            const app = await services.appService.getAppById(appId, userId);
            sendSuccessResponse(ctx, 200, { app });
        } catch (error) {
            if (error instanceof NotFoundError) {
                logger.warn('App not found', { appId });
                sendErrorResponse(ctx, 404, 'App not found');
                return;
            }
            if (error instanceof UnauthorizedError) {
                sendErrorResponse(ctx, 403, 'Unauthorized to access this app');
                return;
            }
            logger.error(error, 'Error fetching app by ID', { appId });
            sendErrorResponse(ctx, 500, 'Internal server error');
        }
    });

    return router;
}    

