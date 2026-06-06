import Router from "@koa/router";
import { buildAppRouter } from "./v1/app";
import { router as authRouter } from "./v1/auth";
import { buildGamesRouter } from "./v1/games";
import { authMiddleware } from "@/middleware/auth";
import { type Services } from "@/services";

export const buildApiRouter = (deps: { services: Services }) => {
  const router = new Router();

  router.use("/v1/auth", authRouter.routes());
  router.use("/v1/apps", buildAppRouter(deps).routes());
  router.use("/v1/games", authMiddleware, buildGamesRouter().routes());

  return router;
};
