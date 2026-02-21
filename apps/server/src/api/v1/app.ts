import Router from '@koa/router';
import { logger } from '@/logger';
import { authMiddleware } from '@/middleware/auth';
import { sendErrorResponse, sendSuccessResponse } from '../responses';
import { AuthContext } from '@/auth';
import { Services } from '@/services';
import { NotFoundError, UnauthorizedError } from '@/domains/common/errors';
import { appConfig } from '@/config';
import * as fs from 'fs/promises';
import * as path from 'path';

const EXAMPLES_DIR = path.resolve(process.cwd(), '../../packages/examples/src');

interface SaveFileRequest {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
}

interface SaveRequest {
  files: SaveFileRequest[];
}

function isValidPath(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  return !normalized.startsWith('..') && !path.isAbsolute(normalized);
}

export const buildAppRouter = ({
    services
}: {
    services: Services
}) => {
    const router = new Router();

    router.post('/:appId+/save', async (ctx) => {
        if (appConfig.environment !== 'dev') {
            sendErrorResponse(ctx, 403, 'Save endpoint only available in development');
            return;
        }

        const { appId } = ctx.params;
        const body = ctx.request.body as SaveRequest;

        if (!appId || appId.includes('..') || appId.startsWith('/')) {
            sendErrorResponse(ctx, 400, 'Invalid appId');
            return;
        }

        if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
            sendErrorResponse(ctx, 400, 'No files to save');
            return;
        }

        const appDir = path.join(EXAMPLES_DIR, appId);

        try {
            await fs.access(appDir);
        } catch {
            sendErrorResponse(ctx, 404, `App directory not found: ${EXAMPLES_DIR}/${appId}`);
            return;
        }

        const results: Array<{ path: string; success: boolean; error?: string }> = [];

        for (const file of body.files) {
            if (!isValidPath(file.path)) {
                results.push({ path: file.path, success: false, error: 'Invalid path' });
                continue;
            }

            const fullPath = path.join(appDir, file.path);
            if (!fullPath.startsWith(appDir)) {
                results.push({ path: file.path, success: false, error: 'Path traversal detected' });
                continue;
            }

            try {
                await fs.mkdir(path.dirname(fullPath), { recursive: true });
                const content = file.encoding === 'base64'
                    ? Buffer.from(file.content, 'base64')
                    : file.content;
                await fs.writeFile(fullPath, content, file.encoding === 'base64' ? undefined : 'utf8');
                results.push({ path: file.path, success: true });
                logger.info({ appId, filePath: file.path }, 'Saved widget file');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                results.push({ path: file.path, success: false, error: message });
                logger.error({ appId, filePath: file.path, error: message }, 'Failed to save widget file');
            }
        }

        const allSucceeded = results.every(r => r.success);
        if (allSucceeded) {
            sendSuccessResponse(ctx, 200, { saved: results.length });
        } else {
            ctx.status = 207;
            ctx.body = { success: false, results };
        }
    });
    
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

