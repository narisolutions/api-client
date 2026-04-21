import { vi } from "vitest";

export const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

export const jsonResponse = (body: unknown, init: ResponseInit = { status: 200 }) =>
    new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });

export const lastCall = () => mockFetch.mock.calls[mockFetch.mock.calls.length - 1];

export const abortableFetch = () =>
    mockFetch.mockImplementation(
        (_url, init) =>
            new Promise((_, reject) => {
                const signal = init.signal as AbortSignal;
                if (signal.aborted) {
                    reject(new Error("aborted"));
                    return;
                }
                signal.addEventListener("abort", () => reject(new Error("aborted")));
            }),
    );
