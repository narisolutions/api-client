import { Auth } from "firebase/auth";
import type { HttpClientOptions, HttpRequestOptions } from "./public.types";
import type { GetBodyInput, GetHeadersInput, RequestMethod } from "./private.types";
import { LanguageCode, messages } from "./i18n";
import constant from "./constant";

const { DEFAULT_CLIENT_VERSION, SUPPORTED_FILE_TYPES, SUPPORTED_MEDIA_TYPES } = constant;

class HttpClient {
    public baseURL: string | null = null;
    public language: LanguageCode = "en";

    protected authType: "Bearer" = "Bearer";
    protected authInstance: Auth | null = null;
    protected onAuthFailure?: () => void;
    protected timeoutMs = 20000;
    protected onTimeout?: (route: string) => void;
    protected headers: Record<string, string> = {};

    constructor(config: HttpClientOptions) {
        this.validateBaseURL(config.baseURL);

        this.baseURL = config.baseURL;

        if (config.timeoutMs) this.timeoutMs = config.timeoutMs;
        if (config.onTimeout) this.onTimeout = config.onTimeout;
        if (config.authType) this.authType = config.authType;
        if (config.authInstance) this.authInstance = config.authInstance;
        if (config.onAuthFailure) this.onAuthFailure = config.onAuthFailure;
        if (config.headers) this.headers = config.headers;
        if (config.language) this.language = config.language;
    }

    async get<T>(route: string, config?: Omit<HttpRequestOptions, "data">) {
        const response = await this.fetch("GET", route, config);

        if (!response.ok) await this.handleError(response);
        const result: T = await this.handleSuccess(response);
        return result;
    }

    async post<T>(route: string, config?: HttpRequestOptions) {
        const response = await this.fetch("POST", route, config);

        if (!response.ok) await this.handleError(response);
        const result: T = await this.handleSuccess(response);
        return result;
    }

    async put<T>(route: string, config?: HttpRequestOptions) {
        const response = await this.fetch("PUT", route, config);

        if (!response.ok) await this.handleError(response);
        const result: T = await this.handleSuccess(response);
        return result;
    }

    async patch<T>(route: string, config?: HttpRequestOptions) {
        const response = await this.fetch("PATCH", route, config);

        if (!response.ok) await this.handleError(response);
        const result: T = await this.handleSuccess(response);
        return result;
    }

    async delete<T>(route: string, config?: Omit<HttpRequestOptions, "data">) {
        const response = await this.fetch("DELETE", route, config);

        if (!response.ok) await this.handleError(response);
        const result: T = await this.handleSuccess(response);
        return result;
    }

    protected async fetch(method: RequestMethod, route: string, config?: HttpRequestOptions) {
        const authenticate = config?.authenticate ?? true;
        const controller = config?.controller ?? new AbortController();
        const data = config?.data ?? null;
        const customHeaders = { ...this.headers, ...config?.headers };
        const timeoutMs = config?.timeoutMs ?? this.timeoutMs;

        if ((method === "GET" || method === "DELETE") && data !== null) {
            throw new Error(messages[this.language].INVALID_GET_DATA(method));
        }

        const id = setTimeout(() => {
            this.onTimeout?.(route);
            controller.abort();
        }, timeoutMs);
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

        const canonicalizeHeaderKey = (key: string) =>
            key
                .toLowerCase()
                .split("-")
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join("-");

        const normalizedHeaders: Record<string, string> = {};
        const seenHeaderKeys = new Map<string, string[]>();

        for (const [key, value] of Object.entries(customHeaders ?? {})) {
            const lowerKey = key.toLowerCase();

            if (!seenHeaderKeys.has(lowerKey)) {
                seenHeaderKeys.set(lowerKey, []);
            }
            seenHeaderKeys.get(lowerKey)!.push(key);
            normalizedHeaders[canonicalizeHeaderKey(key)] = value;
        }

        // Warn if duplicate keys (case-insensitive)
        for (const [lowerKey, variants] of seenHeaderKeys) {
            if (variants.length > 1) {
                console.warn(
                    `[HttpClient] Duplicate header ${lowerKey} detected with different casing: ${variants.join(
                        ", ",
                    )}. Only the last one will be used.`,
                );
            }
        }

        const hasCustomContentType = "Content-Type" in normalizedHeaders;

        const headers: Record<string, string> = {
            ...normalizedHeaders,
            ...(token && { Authorization: `Bearer ${token}` }),
            "X-Client-Version": normalizedHeaders?.["X-Client-Version"] ?? DEFAULT_CLIENT_VERSION,
        };

        if (!hasCustomContentType) {
            if (data instanceof URLSearchParams) {
                headers["Content-Type"] = "application/x-www-form-urlencoded";
            } else if (
                !(data instanceof FormData) &&
                !(data instanceof Blob) &&
                !(data instanceof ArrayBuffer) &&
                !(data instanceof ReadableStream)
            ) {
                headers["Content-Type"] = "application/json";
            }
        }

        return headers;
    }

    protected getBody(input: GetBodyInput) {
        const { data } = input;

        if (data === null || data === undefined) return null;
        if (data instanceof FormData) return data;
        if (data instanceof URLSearchParams) return data;
        if (data instanceof Blob || data instanceof ArrayBuffer || data instanceof ReadableStream)
            return data;
        return JSON.stringify(data);
    }

    protected async handleSuccess(response: Response) {
        if (response.headers.get("update-token") === "true") {
            await this.getToken(true);
        }

        const contentType = response.headers.get("content-type");

        const isJson = contentType?.startsWith("application/json");
        const isFile = SUPPORTED_FILE_TYPES.some(type => contentType?.startsWith(type));
        const isMedia = SUPPORTED_MEDIA_TYPES.some(type => contentType?.startsWith(type));

        if (isJson) return await response.json();

        if (isFile || isMedia) {
            const blob = await response.blob();
            const contentDisposition = response.headers.get("Content-Disposition");
            const filename = this.extractFilename(contentDisposition);

            return { blob, ...(filename && { filename }) };
        }

        return await response.text();
    }

    protected async handleError(response: Response) {
        let msg = "";

        if (response.headers.get("content-type")?.includes("application/json")) {
            const data = await response.json();

            msg =
                data.message ??
                data.msg ??
                data.error ??
                data.detail ??
                data.details ??
                (Array.isArray(data.errors) ? data.errors.join(", ") : undefined) ??
                (typeof data === "string" ? data : JSON.stringify(data));
        } else {
            msg = await response.text();
        }

        throw new Error(msg || `Request failed with status ${response.status}.`);
    }

    private async getToken(refresh?: boolean) {
        const maxRetries = 3;
        let retries = 0;
        let token = "";

        while (retries < maxRetries) {
            try {
                const currentUser = this.authInstance?.currentUser;

                if (!currentUser) {
                    const waitMs = retries === 0 ? 3000 : retries * 1000;
                    await this.sleep(waitMs);
                    retries++;
                    continue;
                }

                token = await currentUser.getIdToken(refresh);
                break;
            } catch (err) {
                retries++;
                if (retries >= maxRetries) {
                    console.error(err);
                    break;
                }
                await this.sleep(retries * 1000);
            }
        }

        if (!token) {
            try {
                await this.authInstance?.signOut();
            } catch (err) {
                console.error("[HttpClient] Failed to sign out after token error:", err);
            }

            this.onAuthFailure?.();

            throw new Error(messages[this.language].SESSION_EXPIRED);
        }

        return token;
    }

    private async sleep(ms: number = 1000) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    private validateBaseURL(baseURL: string) {
        if (!baseURL) {
            throw new Error(messages[this.language].MISSING_BASE_URL);
        }

        let url: URL;
        try {
            url = new URL(baseURL);
        } catch {
            throw new Error(messages[this.language].INVALID_BASE_URL(baseURL));
        }

        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error(messages[this.language].INVALID_PROTOCOL(baseURL));
        }
    }

    protected extractFilename(contentDisposition: string | null) {
        if (!contentDisposition) return;

        try {
            const encoded = contentDisposition.match(/filename\*\s*=\s*[^']*'[^']*'([^;\n]+)/i);
            if (encoded?.[1]) {
                return decodeURIComponent(encoded[1]);
            }

            const regular = contentDisposition.match(/filename\s*=\s*"?([^\";\n]+)"?/i);
            if (regular?.[1]) {
                return regular[1];
            }

            if (/filename/i.test(contentDisposition)) {
                console.warn(
                    `[HttpClient] Unrecognized Content-Disposition format: "${contentDisposition}". Unable to extract filename.`,
                );
            }
        } catch (error) {
            console.warn(
                `[HttpClient] Failed to decode filename from Content-Disposition header: "${contentDisposition}". Error:`,
                error,
            );
        }
    }
}

export default HttpClient;
