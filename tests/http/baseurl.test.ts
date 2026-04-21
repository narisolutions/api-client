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

describe("HttpClient: baseURL validation", () => {
    for (const url of invalidUrls) {
        it(`throws for invalid baseURL: "${url}"`, () => {
            expect(() => new HttpClient({ baseURL: url })).toThrow();
        });
    }

    it("throws MISSING_BASE_URL for empty string", () => {
        expect(() => new HttpClient({ baseURL: "" })).toThrow(/Missing baseURL/);
    });

    it("throws INVALID_PROTOCOL for non-http(s) protocols", () => {
        expect(() => new HttpClient({ baseURL: "ftp://example.com" })).toThrow(
            /Invalid baseURL protocol/,
        );
    });

    it("throws INVALID_BASE_URL for malformed URLs", () => {
        expect(() => new HttpClient({ baseURL: "invalid" })).toThrow(/Invalid baseURL/);
    });

    it("accepts valid https URL", () => {
        expect(() => new HttpClient({ baseURL: "https://api.example.com" })).not.toThrow();
    });

    it("accepts valid http URL", () => {
        expect(() => new HttpClient({ baseURL: "http://localhost:3000" })).not.toThrow();
    });
});
