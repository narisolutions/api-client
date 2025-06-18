import { describe, it, expect, vi, beforeEach } from "vitest";
import HttpClient from "../src/api";

global.fetch = vi.fn();

const invalidUrls = [
    "", // empty string
    "invalid", // no protocol
    "ftp://example.com", // unsupported protocol
    "http//missing-colon.com", // malformed protocol
    "://missing-protocol.com", // completely broken
    "http://", // incomplete
];

describe("HttpClient", () => {
    let client: HttpClient;

    beforeEach(() => {
        client = new HttpClient({ baseURL: "https://api.example.com" });
        vi.clearAllMocks();
    });

    for (const url of invalidUrls) {
        it(`should throw for invalid baseURL: "${url}"`, () => {
            expect(() => new HttpClient({ baseURL: url })).toThrow();
        });
    }
});
