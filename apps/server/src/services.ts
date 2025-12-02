import { buildAppService, type AppService } from "./domains/app";

export type Services = {
    appService: AppService
}

export const buildServices = (): Services => ({
    appService: buildAppService(),
})
