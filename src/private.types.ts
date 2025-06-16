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

export type { RequestMethod, GetHeadersInput, GetBodyInput };
