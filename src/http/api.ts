import { Auth } from "firebase/auth";
import type { HttpClientOptions, HttpRequestOptions } from "./public.types";
import type { GetBodyInput, GetHeadersInput, RequestMethod } from "./private.types";
import { LanguageCode, messages } from "./i18n";
import constant from "./constant";

const { DEFAULT_CLIENT_VERSION, MAX_ERROR_MESSAGE_LENGTH, SUPPORTED_FILE_TYPES, SUPPORTED_MEDIA_TYPES } = constant;

class HttpClient {
    protected readonly baseUrl!: string;
    protected readonly baseOrigin!: string;
    protected language: LanguageCode = "en";

    protected authType: "Bearer" = "Bearer";
    protected authInstance: Auth | null = null;
    protected onAuthFailure?: () => void;
    protected timeoutMs = 20000;
    protected onTimeout?: (route: string) => void;
    protected headers: Record<string, string> = {};
    protected maxResponseBytes?: number;

    constructor({ baseUrl, authInstance, authType, ...rest }: HttpClientOptions) {
        this.validateBaseUrl(baseUrl);
        this.baseUrl = baseUrl;
        this.baseOrigin = new URL(baseUrl).origin;

        if (authType) this.authType = authType;
        if (authInstance) this.authInstance = authInstance;

        this.setOptions(rest);
    }

    setOptions(options: Partial<Omit<HttpClientOptions, "baseUrl" | "authInstance" | "authType">>) {
        if (options.timeoutMs) this.timeoutMs = options.timeoutMs;
        if (options.onTimeout) this.onTimeout = options.onTimeout;
        if (options.onAuthFailure) this.onAuthFailure = options.onAuthFailure;
        if (options.maxResponseBytes !== undefined) this.maxResponseBytes = options.maxResponseBytes;

        if (options.headers) {
            this.headers = {
                ...(this.headers ?? {}),
                ...options.headers,
            };
        }

        if (options.language) this.language = options.language;
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

        const url = this.resolveUrl(route);

        const id = setTimeout(() => {
            this.onTimeout?.(route);
            controller.abort();
        }, timeoutMs);
        const headers = await this.getHeaders({ data, customHeaders, authenticate });

        try {
            const response = await fetch(url, {
                headers,
                method,
                mode: "cors",
                referrer: "no-referrer",
                redirect: authenticate ? "error" : "follow",
                signal: controller.signal,
                ...(data && { body: this.getBody({ data }) }),
            });

            return response;
        } finally {
            clearTimeout(id);
        }
    }

    protected resolveUrl(route: string): string {
        let resolved: URL;
        try {
            resolved = new URL(this.baseUrl + route);
        } catch {
            throw new Error(messages[this.language].INVALID_ROUTE(route));
        }
        if (resolved.origin !== this.baseOrigin) {
            throw new Error(messages[this.language].INVALID_ROUTE(route));
        }
        return resolved.toString();
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
        // TODO: Flow of updating firebase token must be more flexible
        if (response.headers.get("update-token") === "true") {
            await this.getToken(true);
        }

        this.assertResponseSize(response);

        const contentLength = response.headers.get("content-length");
        const contentType = response.headers.get("content-type");
        const status = response.status;

        const isJson = contentType?.startsWith("application/json");
        const isFile = SUPPORTED_FILE_TYPES.some(type => contentType?.startsWith(type));
        const isMedia = SUPPORTED_MEDIA_TYPES.some(type => contentType?.startsWith(type));

        if (isJson) {
            if (contentLength === "0" || status === 204) return null;

            return await response.json();
        }

        if (isFile || isMedia) {
            const blob = await response.blob();

            if (blob.size === 0) return null;

            const contentDisposition = response.headers.get("Content-Disposition");
            const filename = this.extractFilename(contentDisposition);

            return { blob, ...(filename && { filename }) };
        }

        const text = await response.text();

        if (!text) return null;

        return text;
    }

    protected async handleError(response: Response) {
        // TODO: Accommodate common backend error formatting structures
        let msg = "";

        if (response.headers.get("content-type")?.includes("application/json")) {
            const data = await response.json();

            if (data.message && typeof data.message === "string") msg = data.message;
            else if (data.msg && typeof data.msg === "string") msg = data.msg;
            else if (data.error && typeof data.error === "string") msg = data.error;
            else if (data.detail && typeof data.detail === "string") msg = data.detail;
            else if (data.details && typeof data.details === "string") msg = data.details;
            else msg = JSON.stringify(data);
        } else {
            msg = await response.text();
        }

        if (msg.length > MAX_ERROR_MESSAGE_LENGTH) {
            msg = msg.slice(0, MAX_ERROR_MESSAGE_LENGTH) + "… (truncated)";
        }

        throw new Error(msg || messages[this.language].REQUEST_FAILED(response.status));
    }

    protected assertResponseSize(response: Response) {
        if (this.maxResponseBytes === undefined) return;
        const contentLength = response.headers.get("content-length");
        if (!contentLength) return;
        const size = Number(contentLength);
        if (Number.isFinite(size) && size > this.maxResponseBytes) {
            throw new Error(
                messages[this.language].RESPONSE_TOO_LARGE(size, this.maxResponseBytes),
            );
        }
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

    private validateBaseUrl(baseUrl: string) {
        if (!baseUrl) {
            throw new Error(messages[this.language].MISSING_BASE_URL);
        }

        let url: URL;
        try {
            url = new URL(baseUrl);
        } catch {
            throw new Error(messages[this.language].INVALID_BASE_URL(baseUrl));
        }

        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error(messages[this.language].INVALID_PROTOCOL(baseUrl));
        }
    }

    protected extractFilename(contentDisposition: string | null) {
        if (!contentDisposition) return;

        try {
            const encoded = contentDisposition.match(/filename\*\s*=\s*[^']*'[^']*'([^;\n]+)/i);
            if (encoded?.[1]) {
                return this.sanitizeFilename(decodeURIComponent(encoded[1]));
            }

            const regular = contentDisposition.match(/filename\s*=\s*"?([^\";\n]+)"?/i);
            if (regular?.[1]) {
                return this.sanitizeFilename(regular[1]);
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

    private sanitizeFilename(name: string): string | undefined {
        // Strip path separators and control characters so a malicious
        // Content-Disposition can't yield "../etc/passwd" or null-byte
        // terminated names. Consumers still must HTML-escape before
        // rendering in the DOM.
        const cleaned = name.replace(/[\x00-\x1f\x7f/\\]/g, "").trim();
        return cleaned || undefined;
    }
}

export default HttpClient;
