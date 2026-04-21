import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import HttpClient from "../../src/http/api";
import { mockFetch, jsonResponse, lastCall, abortableFetch } from "./helpers";

describe("HttpClient: setOptions", () => {
    beforeEach(() => {
        mockFetch.mockReset();
        mockFetch.mockResolvedValue(jsonResponse({}));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("updates language after construction", async () => {
        const client = new HttpClient({ baseUrl: "https://api.example.com" });
        client.setOptions({ language: "ka" });

        await expect(
            client.get("/x", { authenticate: false, data: {} } as never),
        ).rejects.toThrow(/ვერ გადაეცემა/);
    });

    it("merges headers on setOptions call, later calls override earlier", async () => {
        const client = new HttpClient({
            baseUrl: "https://api.example.com",
            headers: { "X-A": "1" },
        });
        client.setOptions({ headers: { "X-B": "2" } });
        client.setOptions({ headers: { "X-A": "updated" } });

        await client.get("/x", { authenticate: false });

        const [, init] = lastCall();
        expect(init.headers["X-A"]).toBe("updated");
        expect(init.headers["X-B"]).toBe("2");
    });

    it("updates onTimeout callback", async () => {
        vi.useFakeTimers();
        const client = new HttpClient({ baseUrl: "https://api.example.com", timeoutMs: 1000 });
        const onTimeout = vi.fn();
        client.setOptions({ onTimeout });
        abortableFetch();

        const p = client.get("/x", { authenticate: false });
        const assertion = expect(p).rejects.toThrow();
        await vi.advanceTimersByTimeAsync(1000);
        await assertion;
        expect(onTimeout).toHaveBeenCalledWith("/x");
    });

    it("ignores timeoutMs: 0 (falsy guard)", async () => {
        const client = new HttpClient({ baseUrl: "https://api.example.com", timeoutMs: 5000 });
        client.setOptions({ timeoutMs: 0 });
        await client.get("/x", { authenticate: false });
        expect(mockFetch).toHaveBeenCalled();
    });
});

describe("HttpClient: i18n", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("returns Georgian INVALID_GET_DATA for ka language", async () => {
        const client = new HttpClient({ baseUrl: "https://api.example.com", language: "ka" });
        await expect(
            client.get("/x", { authenticate: false, data: {} } as never),
        ).rejects.toThrow(/ვერ გადაეცემა/);
    });

    it("returns Swedish INVALID_GET_DATA for sv language", async () => {
        const client = new HttpClient({ baseUrl: "https://api.example.com", language: "sv" });
        await expect(
            client.get("/x", { authenticate: false, data: {} } as never),
        ).rejects.toThrow(/skicka data med en GET/);
    });

    it("defaults to English INVALID_GET_DATA", async () => {
        const client = new HttpClient({ baseUrl: "https://api.example.com" });
        await expect(
            client.get("/x", { authenticate: false, data: {} } as never),
        ).rejects.toThrow(/Can't pass data to GET/);
    });

    it("validateBaseUrl always uses English (runs before language is set)", () => {
        expect(() => new HttpClient({ baseUrl: "", language: "ka" })).toThrow(/Missing baseUrl/);
        expect(() => new HttpClient({ baseUrl: "", language: "sv" })).toThrow(/Missing baseUrl/);
    });
});
