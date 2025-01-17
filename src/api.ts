import { Auth } from "firebase/auth";
import { ApiConfig, GetBodyInput, GetHeadersInput, RequestConfig, RequestMethod } from "./types";

class RequestHandler {
    public baseURL: string | null = null;
    protected authType: "Bearer" = "Bearer";
    protected authInstance: Auth | null = null;
    protected timeoutMs = 20000;
    protected headers: Record<string, string> = {};

    constructor(config: ApiConfig) {
        this.baseURL = config.baseURL;
        if (config.timeoutMs) this.timeoutMs = config.timeoutMs;
        if (config.authType) this.authType = config.authType;
        if (config.authInstance) this.authInstance = config.authInstance;
        if (config.headers) this.headers = config.headers;
    }

    async get<T>(route: string, config?: Omit<RequestConfig, "data">) {
        const response = await this.fetch("GET", route, config);

        if (!response.ok) await this.handleError(response);
        const result: T = await this.handleSuccess(response);
        return result;
    }

    async post<T>(route: string, config?: RequestConfig) {
        const response = await this.fetch("POST", route, config);

        if (!response.ok) await this.handleError(response);
        const result: T = await this.handleSuccess(response);
        return result;
    }

    async put<T>(route: string, config?: RequestConfig) {
        const response = await this.fetch("PUT", route, config);

        if (!response.ok) await this.handleError(response);
        const result: T = await this.handleSuccess(response);
        return result;
    }

    async patch<T>(route: string, config?: RequestConfig) {
        const response = await this.fetch("PATCH", route, config);

        if (!response.ok) await this.handleError(response);
        const result: T = await this.handleSuccess(response);
        return result;
    }

    async delete<T>(route: string, config?: Omit<RequestConfig, "data">) {
        const response = await this.fetch("DELETE", route, config);

        if (!response.ok) await this.handleError(response);
        const result: T = await this.handleSuccess(response);
        return result;
    }

    protected async fetch(method: RequestMethod, route: string, config?: RequestConfig) {
        const authenticate = config?.authenticate ?? true;
        const controller = config?.controller ?? new AbortController();
        const data = config?.data ?? null;
        const customHeaders = { ...this.headers, ...config?.headers };
        const timeoutMs = config?.timeoutMs ?? this.timeoutMs;

        if ((method === "GET" || method === "DELETE") && data !== null) {
            throw new Error(`Invalid method call. Can't pass data to ${method} request.`);
        }

        const id = setTimeout(() => controller.abort(), timeoutMs);
        const headers = await this.getHeaders({ data, customHeaders, authenticate });

        const response = await fetch(this.baseURL + route, {
            headers,
            method,
            mode: "cors",
            referrer: "no-referrer",
            signal: controller.signal,
            ...(data && { body: this.getBody({ data }) }),
        });

        clearTimeout(id);

        return response;
    }

    protected async getHeaders(input: GetHeadersInput) {
        const { data, customHeaders, authenticate } = input;

        let token = "";

        if (authenticate) {
            token = await this.getToken();
        }

        if (data instanceof FormData) {
            return {
                ...customHeaders,
                ...(token && { Authorization: `Bearer ${token}` }),
            };
        }

        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...customHeaders,
            ...(token && { Authorization: `Bearer ${token}` }),
        };
    }

    protected getBody(input: GetBodyInput) {
        const { data } = input;

        if (!data) return null;

        if (data instanceof FormData) return data;

        return JSON.stringify(data);
    }

    protected async handleSuccess(response: Response) {
        if (response.headers.get("update-token") === "true") {
            await this.getToken(true);
        }

        const contentType = response.headers.get("content-type");

        const isJson = contentType?.startsWith("application/json");

        if (isJson) {
            return await response.json();
        }

        const isFile =
            contentType?.startsWith("application/pdf") ||
            contentType?.startsWith("application/zip") ||
            contentType?.startsWith("application/x-zip-compressed") ||
            contentType?.startsWith("application/msword") ||
            contentType?.startsWith("application/vnd.ms-excel");

        const isMedia =
            contentType?.startsWith("audio/") ||
            contentType?.startsWith("video/") ||
            contentType?.startsWith("image/") ||
            contentType?.startsWith("font/");

        // TODO: Handling media files needs improvements
        if (isFile || isMedia) {
            const blob = await response.blob();
            const filename = response.headers.get("Content-Disposition");

            return { blob, ...(filename && { filename }) };
        }

        return await response.text();
    }

    protected async handleError(response: Response) {
        let error;

        if (response.headers.get("content-type")?.startsWith("application/json")) {
            error = await response.json();
        } else {
            error = await response.text();
        }

        throw Error(error);
    }

    private async getToken(refresh?: boolean) {
        let retries = 0;
        let token = "";
        let isInit = false;

        const get = async (refresh?: boolean) => {
            try {
                if (retries === 3) return;

                const currentUser = this.authInstance?.currentUser;

                if (!currentUser) {
                    retries++;
                    const waitMs = !isInit ? 3000 : retries * 1000;
                    if (!isInit) isInit = true;

                    await this.sleep(waitMs);
                    await get(refresh);
                } else {
                    token = await currentUser.getIdToken(refresh);
                }
            } catch (e) {
                if (retries === 3) {
                    console.error(e);
                } else {
                    retries++;
                    await this.sleep();
                    await get();
                }
            }
        };

        await get(refresh);

        if (!token) {
            await this.authInstance?.signOut();
            throw new Error("Your session either has expired or is invalid. Please login again.");
        }

        return token;
    }

    private async sleep(ms: number = 1000) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default RequestHandler;
