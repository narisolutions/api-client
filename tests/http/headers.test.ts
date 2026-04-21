import { describe, it, expect, beforeEach, vi } from "vitest";
import HttpClient from "../../src/http/api";
import pkg from "../../package.json";
import { mockFetch, jsonResponse, lastCall } from "./helpers";

describe("HttpClient: headers", () => {
    beforeEach(() => {
        mockFetch.mockReset();
        mockFetch.mockResolvedValue(jsonResponse({}));
    });

    it("merges default and per-request headers, request wins on conflict", async () => {
        const client = new HttpClient({
            baseURL: "https://api.example.com",
            headers: { "X-A": "default-a", "X-B": "default-b" },
        });

        await client.get("/x", {
            authenticate: false,
            headers: { "X-B": "override-b", "X-C": "req-c" },
        });

        const [, init] = lastCall();
        expect(init.headers["X-A"]).toBe("default-a");
        expect(init.headers["X-B"]).toBe("override-b");
        expect(init.headers["X-C"]).toBe("req-c");
    });

    it("canonicalizes header casing", async () => {
        const client = new HttpClient({ baseURL: "https://api.example.com" });

        await client.get("/x", {
            authenticate: false,
            headers: { "x-custom-id": "abc" },
        });

        const [, init] = lastCall();
        expect(init.headers["X-Custom-Id"]).toBe("abc");
    });

    it("warns on duplicate headers with differing casing", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const client = new HttpClient({ baseURL: "https://api.example.com" });

        await client.get("/x", {
            authenticate: false,
            headers: { "x-trace": "a", "X-Trace": "b" },
        });

        const [, init] = lastCall();
        expect(init.headers["X-Trace"]).toBe("b");
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("Duplicate header x-trace"));
        warn.mockRestore();
    });

    it("sets X-Client-Version from package.json by default", async () => {
        const client = new HttpClient({ baseURL: "https://api.example.com" });
        await client.get("/x", { authenticate: false });
        const [, init] = lastCall();
        expect(init.headers["X-Client-Version"]).toBe(pkg.version);
    });

    it("allows overriding X-Client-Version via headers", async () => {
        const client = new HttpClient({ baseURL: "https://api.example.com" });
        await client.get("/x", {
            authenticate: false,
            headers: { "X-Client-Version": "consumer-1.0.0" },
        });
        const [, init] = lastCall();
        expect(init.headers["X-Client-Version"]).toBe("consumer-1.0.0");
    });
});
