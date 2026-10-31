import type { AxiosRequestConfig } from "axios";

declare module "axios" {
    interface AxiosRequestConfig {
        requireAuth?: boolean;
        _retry?: boolean;
    }
}

export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
    requireAuth? : boolean,
    _retry? : boolean
}