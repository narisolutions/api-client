import { describe, it, expect, beforeEach } from "vitest";
import HttpClient from "../../src/http/api";
import { mockFetch, jsonResponse, lastCall } from "./helpers";

describe("HttpClient: URL origin enforcement", () => {
    let client: HttpClient;

    beforeEach(() => {
        client = new HttpClient({ baseUrl: "https://api.example.com" });
        mockFetch.mockReset();
        mockFetch.mockResolvedValue(jsonResponse({}));
    });

    it("rejects route that hijacks host via userinfo (@evil.com)", async () => {
        await expect(
            client.get("@evil.com/steal", { authenticate: false }),
        ).rejects.toThrow(/Invalid route/);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("rejects route that concatenates into a different origin", async () => {
        await expect(
            client.get("https://evil.com/x", { authenticate: false }),
        ).rejects.toThrow(/Invalid route/);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("accepts normal paths beginning with /", async () => {
        await client.get("/users/1", { authenticate: false });
        const [url] = lastCall();
        expect(url).toBe("https://api.example.com/users/1");
    });
});

describe("HttpClient: redirect policy", () => {
    beforeEach(() => {
        mockFetch.mockReset();
        mockFetch.mockResolvedValue(jsonResponse({}));
    });

    it("sets redirect: 'error' for authenticated requests", async () => {
        const authInstance = {
            currentUser: { getIdToken: async () => "t" },
            signOut: async () => {},
        };
        const client = new HttpClient({
            baseUrl: "https://api.example.com",
            authInstance: authInstance as never,
        });

        await client.get("/x");

        const [, init] = lastCall();
        expect(init.redirect).toBe("error");
    });

    it("sets redirect: 'follow' for unauthenticated requests", async () => {
        const client = new HttpClient({ baseUrl: "https://api.example.com" });
        await client.get("/x", { authenticate: false });
        const [, init] = lastCall();
        expect(init.redirect).toBe("follow");
    });
});

describe("HttpClient: error message truncation", () => {
    let client: HttpClient;

    beforeEach(() => {
        client = new HttpClient({ baseUrl: "https://api.example.com" });
        mockFetch.mockReset();
    });

    it("truncates error body longer than 500 chars and appends marker", async () => {
        const huge = "a".repeat(2000);
        mockFetch.mockResolvedValueOnce(
            new Response(huge, {
                status: 500,
                headers: { "content-type": "text/plain" },
            }),
        );

        try {
            await client.get("/x", { authenticate: false });
            throw new Error("expected rejection");
        } catch (err) {
            const msg = (err as Error).message;
            expect(msg.length).toBeLessThanOrEqual(520);
            expect(msg).toMatch(/truncated/);
        }
    });

    it("leaves short error messages untouched", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response("short error", {
                status: 500,
                headers: { "content-type": "text/plain" },
            }),
        );
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow("short error");
    });
});

describe("HttpClient: maxResponseBytes", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("throws when Content-Length exceeds configured cap", async () => {
        const client = new HttpClient({
            baseUrl: "https://api.example.com",
            maxResponseBytes: 100,
        });
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                    "content-length": "1000",
                },
            }),
        );

        await expect(client.get("/x", { authenticate: false })).rejects.toThrow(
            /exceeds the configured maxResponseBytes/,
        );
    });

    it("allows responses within cap", async () => {
        const client = new HttpClient({
            baseUrl: "https://api.example.com",
            maxResponseBytes: 10_000,
        });
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                    "content-length": "50",
                },
            }),
        );
        await expect(client.get("/x", { authenticate: false })).resolves.toEqual({ ok: true });
    });

    it("skips check when Content-Length is missing", async () => {
        const client = new HttpClient({
            baseUrl: "https://api.example.com",
            maxResponseBytes: 10,
        });
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { "content-type": "application/json" },
            }),
        );
        await expect(client.get("/x", { authenticate: false })).resolves.toEqual({ ok: true });
    });

    it("is undefined by default (no cap)", async () => {
        const client = new HttpClient({ baseUrl: "https://api.example.com" });
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                    "content-length": "999999999",
                },
            }),
        );
        await expect(client.get("/x", { authenticate: false })).resolves.toEqual({ ok: true });
    });
});

describe("HttpClient: SVG not auto-returned as blob", () => {
    it("returns SVG body as text instead of { blob }", async () => {
        const client = new HttpClient({ baseUrl: "https://api.example.com" });
        mockFetch.mockReset();
        mockFetch.mockResolvedValueOnce(
            new Response("<svg><script>alert(1)</script></svg>", {
                status: 200,
                headers: { "content-type": "image/svg+xml" },
            }),
        );

        const result = await client.get("/x", { authenticate: false });

        expect(typeof result).toBe("string");
        expect(result).toContain("<svg>");
    });
});

describe("HttpClient: filename sanitization", () => {
    let client: HttpClient;

    beforeEach(() => {
        client = new HttpClient({ baseUrl: "https://api.example.com" });
        mockFetch.mockReset();
    });

    const fileResponse = (disposition: string) =>
        new Response(new Blob(["x"], { type: "application/pdf" }), {
            status: 200,
            headers: {
                "content-type": "application/pdf",
                "Content-Disposition": disposition,
            },
        });

    it("strips forward slashes from filename", async () => {
        mockFetch.mockResolvedValueOnce(fileResponse('attachment; filename="../etc/passwd"'));
        const r = (await client.get("/f", { authenticate: false })) as { filename: string };
        expect(r.filename).toBe("..etcpasswd");
    });

    it("strips backslashes from filename", async () => {
        mockFetch.mockResolvedValueOnce(fileResponse('attachment; filename="a\\b.pdf"'));
        const r = (await client.get("/f", { authenticate: false })) as { filename: string };
        expect(r.filename).toBe("ab.pdf");
    });

    it("strips control characters from filename", async () => {
        mockFetch.mockResolvedValueOnce(
            fileResponse("attachment; filename*=UTF-8''safe%00name.pdf"),
        );
        const r = (await client.get("/f", { authenticate: false })) as { filename: string };
        expect(r.filename).toBe("safename.pdf");
    });

    it("drops filename entirely when sanitization leaves empty string", async () => {
        mockFetch.mockResolvedValueOnce(fileResponse('attachment; filename="///"'));
        const r = (await client.get("/f", { authenticate: false })) as {
            filename?: string;
        };
        expect(r.filename).toBeUndefined();
    });
});
