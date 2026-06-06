import { UnauthorizedError } from "../common/errors";
import { getAppStore } from "./app-store";
import type { App } from "@zolver/core";

export class AppService {
  constructor(private readonly appStore = getAppStore()) {}

  async getAppById(appId: string, userId: string): Promise<App> {
    const app = await this.appStore.getApp(appId);

    if (app.visibility === "public") {
      return app;
    }

    if (app.authorId !== userId) {
      throw new UnauthorizedError("User does not own the app");
    }

    return app;
  }
}
