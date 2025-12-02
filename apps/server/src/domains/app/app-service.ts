import type { App } from '@kossabos/core';
import { getAppStore } from './app-store';
import { NotFoundError, UnauthorizedError } from '../common/errors';

export class AppService {
  constructor(private readonly appStore = getAppStore()) {}

  async getAppById(appId: string, userId: string): Promise<App> {
    const app = await this.appStore.getApp(appId);

    if (!app) {
      throw new NotFoundError('App not found');
    }

    if (app.visibility === 'public') {
      return app;
    }

    if (app.authorId !== userId) {
      throw new UnauthorizedError('User does not own the app');
    }

    return app;
  }
}
