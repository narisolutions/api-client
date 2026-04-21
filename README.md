# ⚠️ Warning!

This library is **fresh** and still under active development.

**Current status:**

-   Supports only **Firebase JWT authentication**
-   Designed as a lightweight, TypeScript-first alternative to [axios](https://www.npmjs.com/package/axios)
-   Smaller bundle size, focused on covering the most common API request scenarios
-   Will become more sophisticated over time (additional clients such as GraphQL are planned under separate subpaths)

## Installation

Using npm

```bash
npm install @narisolutions/api-client
```

Using yarn

```bash
yarn add @narisolutions/api-client
```

## Importing

Prefer the subpath import — it guarantees sibling clients (e.g. a future GraphQL client) will never be pulled into your bundle:

```ts
import { HttpClient } from "@narisolutions/api-client/http";
```

The root import still works and re-exports `HttpClient` for backwards compatibility:

```ts
import { HttpClient } from "@narisolutions/api-client";
```

## JavaScript

```js
import { HttpClient } from "@narisolutions/api-client/http";

const api = new HttpClient({ baseUrl: "https://api.example.com/v1" });

const getUsers = async () => {
    try {
        const users = await api.get("/users");
        console.log(users);
    } catch (error) {
        console.error(error);
    }
};
```

## TypeScript

```ts
import { HttpClient } from "@narisolutions/api-client/http";

const api = new HttpClient({ baseUrl: "https://api.example.com/v1" });

type User = {
    name: string;
    age: number;
};

const getUsers = async () => {
    try {
        const users = await api.get<User[]>("/users");
        console.log(users);
    } catch (error) {
        console.error(error);
    }
};
```

## `HttpClient` Options

Passed to the constructor or `setOptions` (except `baseUrl`, `authInstance`, `authType` which are construction-time only).

| Option             | Type                          | Required | Description                                                                                                                |
| ------------------ | ----------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`          | `string`                      | ✅       | Base URL for all API requests. Must be a well-formed absolute `http(s)` URL. Every request's resolved URL is origin-checked against this value. |
| `language`         | `"en"` \| `"sv"` \| `"ka"`    | ⏺        | Localizes internal error messages. Defaults to `"en"`.                                                                     |
| `authType`         | `"Bearer"`                    | ⏺        | Authentication type. Currently only `"Bearer"` is supported.                                                               |
| `authInstance`     | `Auth` (from `firebase/auth`) | ⏺        | Firebase Auth instance. Required for authenticated requests; supplies the bearer token automatically.                      |
| `onAuthFailure`    | `() => void`                  | ⏺        | Callback triggered when token acquisition fails after retries. Runs after the client auto signs the user out and throws.   |
| `timeoutMs`        | `number`                      | ⏺        | Default request timeout in milliseconds. Defaults to `20000`.                                                              |
| `onTimeout`        | `(route: string) => void`     | ⏺        | Callback triggered when a request exceeds its timeout.                                                                     |
| `headers`          | `Record<string, string>`      | ⏺        | Default headers sent with every request. Per-request `headers` override matching keys.                                     |
| `maxResponseBytes` | `number`                      | ⏺        | Reject responses whose `Content-Length` exceeds this limit before the body is read. Unset by default (no cap).             |

## Per-request Options

Passed as the second argument to `get` / `post` / `put` / `patch` / `delete`.

| Option         | Type                     | Description                                                                                                                                                    |
| -------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`         | `unknown`                | Request body. Plain objects are JSON-serialized; `FormData`, `URLSearchParams`, `Blob`, `ArrayBuffer`, and `ReadableStream` are passed through. Rejected on `GET` and `DELETE`. |
| `controller`   | `AbortController`        | Custom abort controller. One is created automatically if omitted.                                                                                              |
| `authenticate` | `boolean`                | Attach the bearer token. Defaults to `true`.                                                                                                                   |
| `headers`      | `Record<string, string>` | Per-request headers; override defaults.                                                                                                                        |
| `timeoutMs`    | `number`                 | Per-request timeout; overrides the client default.                                                                                                             |

## Response handling

| Content-Type                           | Return shape                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `application/json`                     | Parsed JSON; `null` for `204` or `Content-Length: 0`.                                |
| Supported file/media types             | `{ blob, filename? }` — `filename` extracted and sanitized from `Content-Disposition`. |
| Anything else (incl. `image/svg+xml`)  | Raw text from `response.text()`; `null` if empty.                                    |

Errors (non-2xx) throw an `Error`. The message is extracted from the JSON body's `message` / `msg` / `error` / `detail` / `details` field, or the whole body if none match. Message is capped at **500 chars** and suffixed with `"… (truncated)"` when exceeded.

## Security notes

-   Routes are resolved against `baseUrl` and the resulting URL's origin is compared against the configured origin. Attempts to hijack the host (e.g. `client.get("@evil.com/x")`) are rejected before the request is sent.
-   Authenticated requests use `redirect: "error"` so a misbehaving server cannot redirect the bearer token to another location. Unauthenticated requests follow redirects normally.
-   `image/svg+xml` is intentionally **not** returned as a blob. SVGs can execute scripts when rendered via `createObjectURL` or embedded as `<object>`; consumers must handle SVG responses deliberately (received as text here).
-   Filenames from `Content-Disposition` have path separators (`/`, `\`) and control characters stripped. HTML-escape before rendering in the DOM.
-   Set `maxResponseBytes` on endpoints that return untrusted data to guard against memory exhaustion via hostile responses.

## Migrating from < 1.10

-   `baseURL` is now `baseUrl`. Update every `new HttpClient({ baseURL: ... })` call site.
-   Imports from `@narisolutions/api-client/http` are now preferred over the root; both continue to work.
-   `maxResponseBytes` is a new optional field on `HttpClientOptions`; no action needed if you don't use it.
