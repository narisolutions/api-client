import { Auth } from "firebase/auth";

type ApiConfig = {
    /**
     * Base URL to be used for api requests.
     * @example "https://api.fake.com/v1"
     */
    baseURL: string;
    /**
     * Authentication method for requests. Currently supports only Bearer authentication method.
     * @default "Bearer"
     */
    authType?: "Bearer";
    /**
     * Firebase Auth instance.
     */
    authInstance?: Auth;
    /**
     * Request timeout in milliseconds.
     * @default 20000
     */
    timeoutMs?: number;
    /**
     * Custom headers to send for each request. This takes priority over default headers.
     */
    headers?: Record<string, string>;
};

type RequestConfig = {
    /**
     * Body of the request
     */
    data?: unknown;
    /**
     * Abort controller for canceling requests. If not provided method will generate it's own abort controller instance.
     */
    controller?: AbortController;
    /**
     * Whether or not request should be authenticated.
     * @default true
     */
    authenticate?: boolean;
    /**
     * Custom headers to send for this request. This takes priority over default headers and will override matched properties in headers during class instantiation.
     */
    headers?: Record<string, string>;
    /**
     * Timeout for this request in milliseconds.
     */
    timeoutMs?: number;
};

type GetHeadersInput = {
    data?: unknown;
    customHeaders?: Record<string, string>;
    authenticate?: boolean;
};
type GetBodyInput = {
    data?: unknown;
    authenticate?: boolean;
};

type RequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type { ApiConfig, RequestConfig, RequestMethod, GetHeadersInput, GetBodyInput };
