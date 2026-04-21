import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import HttpClient from "../../src/http/api";
import { mockFetch, jsonResponse, lastCall } from "./helpers";

describe("HttpClient: authentication", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("injects Bearer token in Authorization header", async () => {
        const authInstance = {
            currentUser: { getIdToken: vi.fn().mockResolvedValue("fake-token") },
            signOut: vi.fn(),
        };
        const client = new HttpClient({
            baseUrl: "https://api.example.com",
            authInstance: authInstance as never,
        });
        mockFetch.mockResolvedValueOnce(jsonResponse({}));

        await client.get("/x");

        const [, init] = lastCall();
        expect(init.headers["Authorization"]).toBe("Bearer fake-token");
        expect(authInstance.currentUser.getIdToken).toHaveBeenCalledWith(undefined);
    });

    it("skips token when authenticate is false", async () => {
        const authInstance = {
            currentUser: { getIdToken: vi.fn().mockResolvedValue("fake-token") },
            signOut: vi.fn(),
        };
        const client = new HttpClient({
            baseUrl: "https://api.example.com",
            authInstance: authInstance as never,
        });
        mockFetch.mockResolvedValueOnce(jsonResponse({}));

        await client.get("/x", { authenticate: false });

        const [, init] = lastCall();
        expect(init.headers["Authorization"]).toBeUndefined();
        expect(authInstance.currentUser.getIdToken).not.toHaveBeenCalled();
    });

    it("refreshes token when response has 'update-token: true' header", async () => {
        const getIdToken = vi.fn().mockResolvedValue("fake-token");
        const authInstance = { currentUser: { getIdToken }, signOut: vi.fn() };
        const client = new HttpClient({
            baseUrl: "https://api.example.com",
            authInstance: authInstance as never,
        });
        mockFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                    "update-token": "true",
                },
            }),
        );

        await client.get("/x", { authenticate: false });

        expect(getIdToken).toHaveBeenCalledWith(true);
    });

    it("signs out and calls onAuthFailure after retries exhausted with no user", async () => {
        vi.useFakeTimers();
        const signOut = vi.fn().mockResolvedValue(undefined);
        const onAuthFailure = vi.fn();
        const authInstance = { currentUser: null, signOut };
        const client = new HttpClient({
            baseUrl: "https://api.example.com",
            authInstance: authInstance as never,
            onAuthFailure,
        });
        mockFetch.mockResolvedValue(jsonResponse({}));

        const p = client.get("/x");
        const assertion = expect(p).rejects.toThrow(/session|სესია|session har/i);

        await vi.advanceTimersByTimeAsync(3000);
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(2000);

        await assertion;
        expect(signOut).toHaveBeenCalledTimes(1);
        expect(onAuthFailure).toHaveBeenCalledTimes(1);
    });

    it("retries on getIdToken throw and ultimately throws SESSION_EXPIRED", async () => {
        vi.useFakeTimers();
        const getIdToken = vi.fn().mockRejectedValue(new Error("token backend down"));
        const signOut = vi.fn().mockResolvedValue(undefined);
        const authInstance = { currentUser: { getIdToken }, signOut };
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const client = new HttpClient({
            baseUrl: "https://api.example.com",
            authInstance: authInstance as never,
        });
        mockFetch.mockResolvedValue(jsonResponse({}));

        const p = client.get("/x");
        const assertion = expect(p).rejects.toThrow(/session|სესია|session har/i);

        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(2000);

        await assertion;
        expect(getIdToken).toHaveBeenCalledTimes(3);
        expect(signOut).toHaveBeenCalledTimes(1);
        errorSpy.mockRestore();
    });

    it("logs but does not rethrow when signOut fails", async () => {
        vi.useFakeTimers();
        const signOutError = new Error("signout down");
        const authInstance = {
            currentUser: null,
            signOut: vi.fn().mockRejectedValue(signOutError),
        };
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const client = new HttpClient({
            baseUrl: "https://api.example.com",
            authInstance: authInstance as never,
        });
        mockFetch.mockResolvedValue(jsonResponse({}));

        const p = client.get("/x");
        const assertion = expect(p).rejects.toThrow(/session|სესია|session har/i);

        await vi.advanceTimersByTimeAsync(3000);
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(2000);

        await assertion;
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Failed to sign out"),
            signOutError,
        );
        errorSpy.mockRestore();
    });
});
