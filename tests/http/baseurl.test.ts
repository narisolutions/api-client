import { describe, it, expect } from "vitest";
import HttpClient from "../../src/http/api";

const invalidUrls = [
    "",
    "invalid",
    "ftp://example.com",
    "http//missing-colon.com",
    "://missing-protocol.com",
    "http://",
];

describe("HttpClient: baseUrl validation", () => {
    for (const url of invalidUrls) {
        it(`throws for invalid baseUrl: "${url}"`, () => {
            expect(() => new HttpClient({ baseUrl: url })).toThrow();
        });
    }

    it("throws MISSING_BASE_URL for empty string", () => {
        expect(() => new HttpClient({ baseUrl: "" })).toThrow(/Missing baseUrl/);
    });

    it("throws INVALID_PROTOCOL for non-http(s) protocols", () => {
        expect(() => new HttpClient({ baseUrl: "ftp://example.com" })).toThrow(
            /Invalid baseUrl protocol/,
        );
    });

    it("throws INVALID_BASE_URL for malformed URLs", () => {
        expect(() => new HttpClient({ baseUrl: "invalid" })).toThrow(/Invalid baseUrl/);
    });

    it("accepts valid https URL", () => {
        expect(() => new HttpClient({ baseUrl: "https://api.example.com" })).not.toThrow();
    });

    it("accepts valid http URL", () => {
        expect(() => new HttpClient({ baseUrl: "http://localhost:3000" })).not.toThrow();
    });
});
