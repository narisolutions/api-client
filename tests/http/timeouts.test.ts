import { describe, it, expect, afterEach, vi } from "vitest";
import HttpClient from "../../src/http/api";
import { mockFetch, jsonResponse, lastCall, abortableFetch } from "./helpers";

describe("HttpClient: timeouts & abort", () => {
    afterEach(() => {
        vi.useRealTimers();
        mockFetch.mockReset();
    });

    it("uses per-request timeoutMs over client default", async () => {
        vi.useFakeTimers();
        const onTimeout = vi.fn();
        const client = new HttpClient({
            baseURL: "https://api.example.com",
            timeoutMs: 60000,
            onTimeout,
        });
        abortableFetch();

        const p = client.get("/slow", { authenticate: false, timeoutMs: 1000 });
        const assertion = expect(p).rejects.toThrow();
        await vi.advanceTimersByTimeAsync(1000);

        await assertion;
        expect(onTimeout).toHaveBeenCalledWith("/slow");
    });

    it("passes through a custom AbortController", async () => {
        const client = new HttpClient({ baseURL: "https://api.example.com" });
        const controller = new AbortController();
        mockFetch.mockResolvedValueOnce(jsonResponse({}));

        await client.get("/x", { authenticate: false, controller });

        const [, init] = lastCall();
        expect(init.signal).toBe(controller.signal);
    });

    it("external abort cancels fetch", async () => {
        const client = new HttpClient({ baseURL: "https://api.example.com" });
        const controller = new AbortController();
        abortableFetch();

        const p = client.get("/x", { authenticate: false, controller });
        controller.abort();

        await expect(p).rejects.toThrow("aborted");
    });

    it("clearTimeout runs even when fetch rejects (no timer leak)", async () => {
        vi.useFakeTimers();
        const onTimeout = vi.fn();
        const client = new HttpClient({
            baseURL: "https://api.example.com",
            timeoutMs: 5000,
            onTimeout,
        });
        mockFetch.mockRejectedValueOnce(new Error("network down"));

        await expect(client.get("/x", { authenticate: false })).rejects.toThrow("network down");

        await vi.advanceTimersByTimeAsync(10000);
        expect(onTimeout).not.toHaveBeenCalled();
    });
});
