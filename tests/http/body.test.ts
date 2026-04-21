import { describe, it, expect, beforeEach } from "vitest";
import HttpClient from "../../src/http/api";
import { mockFetch, jsonResponse, lastCall } from "./helpers";

describe("HttpClient: request body serialization", () => {
    let client: HttpClient;

    beforeEach(() => {
        client = new HttpClient({ baseURL: "https://api.example.com" });
        mockFetch.mockReset();
        mockFetch.mockResolvedValue(jsonResponse({}));
    });

    it("serializes plain objects as JSON with application/json", async () => {
        await client.post("/x", { authenticate: false, data: { a: 1 } });
        const [, init] = lastCall();
        expect(init.body).toBe(JSON.stringify({ a: 1 }));
        expect(init.headers["Content-Type"]).toBe("application/json");
    });

    it("passes FormData through without Content-Type", async () => {
        const form = new FormData();
        form.append("file", new Blob(["x"]), "x.txt");
        await client.post("/x", { authenticate: false, data: form });
        const [, init] = lastCall();
        expect(init.body).toBe(form);
        expect(init.headers["Content-Type"]).toBeUndefined();
    });

    it("passes URLSearchParams with application/x-www-form-urlencoded", async () => {
        const params = new URLSearchParams({ a: "1" });
        await client.post("/x", { authenticate: false, data: params });
        const [, init] = lastCall();
        expect(init.body).toBe(params);
        expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    });

    it("passes Blob through without Content-Type", async () => {
        const blob = new Blob(["x"]);
        await client.post("/x", { authenticate: false, data: blob });
        const [, init] = lastCall();
        expect(init.body).toBe(blob);
        expect(init.headers["Content-Type"]).toBeUndefined();
    });

    it("passes ArrayBuffer through without Content-Type", async () => {
        const buf = new ArrayBuffer(4);
        await client.post("/x", { authenticate: false, data: buf });
        const [, init] = lastCall();
        expect(init.body).toBe(buf);
        expect(init.headers["Content-Type"]).toBeUndefined();
    });

    it("respects custom Content-Type header (lowercased input canonicalized)", async () => {
        await client.post("/x", {
            authenticate: false,
            data: "<xml/>",
            headers: { "content-type": "application/xml" },
        });
        const [, init] = lastCall();
        expect(init.headers["Content-Type"]).toBe("application/xml");
        expect(init.body).toBe(JSON.stringify("<xml/>"));
    });
});
