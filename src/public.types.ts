import { Auth } from "firebase/auth";
import { LanguageCode } from "./i18n";

type HttpClientOptions = {
    /**
     * Base URL to be used for api requests.
     * @example "https://api.fake.com/v1"
     */
    baseURL: string;
    /**
     * Optional language code used to localize internal error messages.
     * Defaults to "en" (English) if not provided.
     */
    language?: LanguageCode;
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
     * Optional callback when token acquisition fails after retries.
     * This runs after the client auto signs the user out and throws.
     */
    onAuthFailure?: () => void;
    /**
     * Request timeout in milliseconds.
     * @default 20000
     */
    timeoutMs?: number;
    /**
     * Optional callback that is triggered when a request exceeds the configured timeout.
     * Useful for logging, showing user notifications, or tracking timeouts in monitoring tools.
     *
     * @param route - The route (relative path) that timed out
     */
    onTimeout?: (route: string) => void;
    /**
     * Custom headers to send for each request. This takes priority over default headers.
     */
    headers?: Record<string, string>;
};

type HttpRequestOptions = {
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

export type { HttpClientOptions, HttpRequestOptions };
