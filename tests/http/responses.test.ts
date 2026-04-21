import { describe, it, expect, beforeEach, vi } from "vitest";
import HttpClient from "../../src/http/api";
import { mockFetch, jsonResponse } from "./helpers";

describe("HttpClient: success response handling", () => {
    let client: HttpClient;

    beforeEach(() => {
        client = new HttpClient({ baseUrl: "https://api.example.com" });
        mockFetch.mockReset();
    });

    it("returns null for 204 JSON responses", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(null, {
                status: 204,
                headers: { "content-type": "application/json" },
            }),
        );
        expect(await client.get("/x", { authenticate: false })).toBeNull();
    });

    it("returns null for JSON with content-length: 0", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response("", {
                status: 200,
                headers: { "content-type": "application/json", "content-length": "0" },
            }),
        );
        expect(await client.get("/x", { authenticate: false })).toBeNull();
    });

    it("returns { blob, filename } for supported file types", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(new Blob(["pdf"], { type: "application/pdf" }), {
                status: 200,
                headers: {
                    "content-type": "application/pdf",
                    "Content-Disposition": 'attachment; filename="report.pdf"',
                },
            }),
        );

        const result = (await client.get("/report", { authenticate: false })) as {
            blob: Blob;
            filename: string;
        };

        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.filename).toBe("report.pdf");
    });

    it("returns { blob } without filename when no Content-Disposition", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(new Blob(["img"], { type: "image/png" }), {
                status: 200,
                headers: { "content-type": "image/png" },
            }),
        );

        const result = (await client.get("/img", { authenticate: false })) as {
            blob: Blob;
            filename?: string;
        };

        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.filename).toBeUndefined();
    });

    it("returns null when blob size is 0", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response(new Blob([]), {
                status: 200,
                headers: { "content-type": "application/pdf" },
            }),
        );
        expect(await client.get("/x", { authenticate: false })).toBeNull();
    });

    it("returns plain text for unrecognized content-type", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response("<h1>hi</h1>", {
                status: 200,
                headers: { "content-type": "text/html" },
            }),
        );
        expect(await client.get("/x", { authenticate: false })).toBe("<h1>hi</h1>");
    });

    it("returns null for empty body with unrecognized content-type", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response("", {
                status: 200,
                headers: { "content-type": "text/html" },
            }),
        );
        expect(await client.get("/x", { authenticate: false })).toBeNull();
    });
});

describe("HttpClient: filename extraction", () => {
    let client: HttpClient;

    const makeFileResponse = (disposition: string) =>
        new Response(new Blob(["x"], { type: "application/pdf" }), {
            status: 200,
            headers: {
                "content-type": "application/pdf",
                "Content-Disposition": disposition,
            },
        });

    beforeEach(() => {
        client = new HttpClient({ baseUrl: "https://api.example.com" });
        mockFetch.mockReset();
    });

    it("extracts quoted filename", async () => {
        mockFetch.mockResolvedValueOnce(makeFileResponse('attachment; filename="doc.pdf"'));
        const r = (await client.get("/f", { authenticate: false })) as { filename: string };
        expect(r.filename).toBe("doc.pdf");
    });

    it("extracts unquoted filename", async () => {
        mockFetch.mockResolvedValueOnce(makeFileResponse("attachment; filename=doc.pdf"));
        const r = (await client.get("/f", { authenticate: false })) as { filename: string };
        expect(r.filename).toBe("doc.pdf");
    });

    it("decodes RFC 5987 filename* encoding", async () => {
        mockFetch.mockResolvedValueOnce(
            makeFileResponse("attachment; filename*=UTF-8''report%20final.pdf"),
        );
        const r = (await client.get("/f", { authenticate: false })) as { filename: string };
        expect(r.filename).toBe("report final.pdf");
    });

    it("warns and returns no filename on unrecognized disposition containing 'filename'", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        mockFetch.mockResolvedValueOnce(makeFileResponse("attachment; filename"));

        const r = (await client.get("/f", { authenticate: false })) as {
            filename?: string;
        };

        expect(r.filename).toBeUndefined();
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("Unrecognized Content-Disposition format"),
        );
        warn.mockRestore();
    });
});

describe("HttpClient: error response handling", () => {
    let client: HttpClient;

    beforeEach(() => {
        client = new HttpClient({ baseUrl: "https://api.example.com" });
        mockFetch.mockReset();
    });

    it.each([
        ["message", { message: "nope" }, "nope"],
        ["msg", { msg: "bad" }, "bad"],
        ["error", { error: "broken" }, "broken"],
        ["detail", { detail: "why" }, "why"],
        ["details", { details: "more" }, "more"],
    ])("extracts %s field from JSON error body", async (_, body, expected) => {
        mockFetch.mockResolvedValueOnce(jsonResponse(body, { status: 400 }));
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow(expected as string);
    });

    it("stringifies JSON error body when no recognized field present", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ foo: "bar" }, { status: 400 }));
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow('{"foo":"bar"}');
    });

    it("ignores non-string message-like fields", async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ message: { nested: true } }, { status: 400 }));
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow(
            '{"message":{"nested":true}}',
        );
    });

    it("falls back to text body for non-JSON error responses", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response("server down", {
                status: 503,
                headers: { "content-type": "text/plain" },
            }),
        );
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow("server down");
    });

    it("falls back to REQUEST_FAILED when error body is empty", async () => {
        mockFetch.mockResolvedValueOnce(
            new Response("", {
                status: 500,
                headers: { "content-type": "text/plain" },
            }),
        );
        await expect(client.get("/x", { authenticate: false })).rejects.toThrow(
            /Request failed with status 500/,
        );
    });
});
