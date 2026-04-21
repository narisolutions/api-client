import { describe, it, expect, beforeEach } from "vitest";
import HttpClient from "../../src/http/api";
import { mockFetch, jsonResponse, lastCall } from "./helpers";

describe("HttpClient: HTTP methods", () => {
    let client: HttpClient;

    beforeEach(() => {
        client = new HttpClient({ baseUrl: "https://api.example.com" });
        mockFetch.mockReset();
    });

    it("GET issues a GET request and parses JSON", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

        const result = await client.get<{ id: number }>("/users/1", { authenticate: false });

        expect(result).toEqual({ id: 1 });
        const [url, init] = lastCall();
        expect(url).toBe("https://api.example.com/users/1");
        expect(init.method).toBe("GET");
    });

    it("POST sends body and returns parsed JSON", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }, { status: 201 }));

        const result = await client.post<{ ok: boolean }>("/users", {
            authenticate: false,
            data: { name: "ada" },
        });

        expect(result).toEqual({ ok: true });
        const [, init] = lastCall();
        expect(init.method).toBe("POST");
        expect(init.body).toBe(JSON.stringify({ name: "ada" }));
    });

    it("PUT sends body", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

        await client.put("/users/1", { authenticate: false, data: { name: "ada" } });

        const [, init] = lastCall();
        expect(init.method).toBe("PUT");
        expect(init.body).toBe(JSON.stringify({ name: "ada" }));
    });

    it("PATCH sends body", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

        await client.patch("/users/1", { authenticate: false, data: { name: "ada" } });

        const [, init] = lastCall();
        expect(init.method).toBe("PATCH");
        expect(init.body).toBe(JSON.stringify({ name: "ada" }));
    });

    it("DELETE issues a DELETE request without body", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

        await client.delete("/users/1", { authenticate: false });

        const [, init] = lastCall();
        expect(init.method).toBe("DELETE");
        expect(init.body).toBeUndefined();
    });

    it("GET rejects when data is provided", async () => {
        await expect(
            client.get("/x", { authenticate: false, data: { a: 1 } } as never),
        ).rejects.toThrow(/Can't pass data to GET/);
    });

    it("DELETE rejects when data is provided", async () => {
        await expect(
            client.delete("/x", { authenticate: false, data: { a: 1 } } as never),
        ).rejects.toThrow(/Can't pass data to DELETE/);
    });
});
