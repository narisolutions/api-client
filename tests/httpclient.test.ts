import { describe, it, expect, vi, beforeEach } from "vitest";
import HttpClient from "../src/api";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const jsonResponse = (body: unknown, init: ResponseInit = { status: 200 }) =>
    new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });

const invalidUrls = [
    "",
    "invalid",
    "ftp://example.com",
    "http//missing-colon.com",
    "://missing-protocol.com",
    "http://",
];

describe("HttpClient: baseURL validation", () => {
    for (const url of invalidUrls) {
        it(`throws for invalid baseURL: "${url}"`, () => {
            expect(() => new HttpClient({ baseURL: url })).toThrow();
        });
    }

    it("accepts valid http and https URLs", () => {
        expect(() => new HttpClient({ baseURL: "https://api.example.com" })).not.toThrow();
        expect(() => new HttpClient({ baseURL: "http://localhost:3000" })).not.toThrow();
    });
});

describe("HttpClient: requests", () => {
    let client: HttpClient;

    beforeEach(() => {
        client = new HttpClient({ baseURL: "https://api.example.com" });
        mockFetch.mockReset();
    });

    it("GET parses JSON responses", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, name: "ada" }));

        const result = await client.get<{ id: number; name: string }>("/users/1", {
            authenticate: false,
        });

        expect(result).toEqual({ id: 1, name: "ada" });
        const [url, init] = mockFetch.mock.calls[0];
        expect(url).toBe("https://api.example.com/users/1");
        expect(init.method).toBe("GET");
        expect(init.headers["Content-Type"]).toBe("application/json");
    });

    it("POST serializes plain object bodies as JSON", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }, { status: 201 }));

        await client.post("/users", {
            authenticate: false,
            data: { name: "ada" },
        });

        const [, init] = mockFetch.mock.calls[0];
        expect(init.method).toBe("POST");
        expect(init.body).toBe(JSON.stringify({ name: "ada" }));
        expect(init.headers["Content-Type"]).toBe("application/json");
    });

    it("POST with FormData omits Content-Type and passes body through", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
        const form = new FormData();
        form.append("file", new Blob(["x"]), "x.txt");

        await client.post("/upload", { authenticate: false, data: form });

        const [, init] = mockFetch.mock.calls[0];
        expect(init.body).toBe(form);
        expect(init.headers["Content-Type"]).toBeUndefined();
    });

    it("GET rejects when data is provided", async () => {
        await expect(
            client.get("/x", { authenticate: false, data: { a: 1 } } as never),
        ).rejects.toThrow(/Can't pass data to GET/);
    });

    it("returns null for 204 JSON responses", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(null, {
                status: 204,
                headers: { "content-type": "application/json" },
            }),
        );

        const result = await client.get("/empty", { authenticate: false });

        expect(result).toBeNull();
    });

    it("merges default and per-request headers, with request taking priority", async () => {
        client = new HttpClient({
            baseURL: "https://api.example.com",
            headers: { "X-A": "default-a", "X-B": "default-b" },
        });
        mockFetch.mockResolvedValueOnce(jsonResponse({}));

        await client.get("/x", {
            authenticate: false,
            headers: { "X-B": "override-b", "X-C": "req-c" },
        });

        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers["X-A"]).toBe("default-a");
        expect(init.headers["X-B"]).toBe("override-b");
        expect(init.headers["X-C"]).toBe("req-c");
    });

    it("canonicalizes header casing and warns on duplicates", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        mockFetch.mockResolvedValueOnce(jsonResponse({}));

        await client.get("/x", {
            authenticate: false,
            headers: { "x-trace": "a", "X-Trace": "b" },
        });

        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers["X-Trace"]).toBe("b");
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("Duplicate header x-trace"));
        warn.mockRestore();
    });
});

describe("HttpClient: error handling", () => {
    let client: HttpClient;

    beforeEach(() => {
        client = new HttpClient({ baseURL: "https://api.example.com" });
        mockFetch.mockReset();
    });

    it("extracts message field from JSON error body", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ message: "nope" }, { status: 400 }));
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow("nope");
    });

    it("extracts msg field from JSON error body", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ msg: "bad" }, { status: 400 }));
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow("bad");
    });

    it("extracts error field from JSON error body", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ error: "broken" }, { status: 500 }));
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow("broken");
    });

    it("extracts detail field from JSON error body", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ detail: "why" }, { status: 422 }));
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow("why");
    });

    it("extracts details field from JSON error body", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ details: "more" }, { status: 422 }));
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow("more");
    });

    it("falls back to text for non-JSON error bodies", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response("server down", {
                status: 503,
                headers: { "content-type": "text/plain" },
            }),
        );
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow("server down");
    });
});
