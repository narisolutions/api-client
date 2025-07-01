# ⚠️ Warning!

This library is **fresh** and still under active development.

✅ **Current status:**

-   Supports only **Firebase JWT authentication**
-   Designed as a lightweight, TypeScript-first alternative to [axios](https://www.npmjs.com/package/axios)
-   Smaller bundle size, focused on covering the most common API request scenarios
-   Will become more sophisticated over time

---

## 🚀 Installation

```bash
yarn add @narisolutions/api-client
```

---

## 📦 Basic Usage (JavaScript)

```js
import { HttpClient } from "@narisolutions/api-client";

const api = new HttpClient({
    baseURL: "https://api.example.com/v1",
    // Optional:
    // authInstance: myFirebaseAuth,
    // timeoutMs: 20000,
    // onTimeout: (route) => console.warn(`Request to ${route} timed out`),
});

const getUsers = async () => {
    try {
        const users = await api.get("/users");
        console.log(users);
    } catch (error) {
        console.error(error);
    }
};
```

---

## ✅ Basic Usage (TypeScript)

```ts
import { HttpClient } from "@narisolutions/api-client";
import { Auth } from "firebase/auth"; // If using Firebase Auth

const api = new HttpClient({
    baseURL: "https://api.example.com/v1",
    authInstance: myFirebaseAuth as Auth,
});

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

---

## ⚙️ `HttpClient` Options

Below are the options you can pass when creating a new `HttpClient`:

| Option          | Type                          | Required | Description                                                                                       |
| --------------- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `baseURL`       | `string`                      | ✅       | Base URL for all API requests. Must be a valid absolute URL (e.g., `https://api.example.com`).    |
| `language`      | `"en"` \| `"sv"` \| `"ka"`    | ⏺        | Localizes internal error messages. Defaults to `"en"`.                                            |
| `authType`      | `"Bearer"`                    | ⏺        | Authentication type. Currently only `"Bearer"` is supported.                                      |
| `authInstance`  | `Auth` (from `firebase/auth`) | ⏺        | Firebase Auth instance for automatic JWT retrieval.                                               |
| `onAuthFailure` | `() => void`                  | ⏺        | Optional callback triggered when token acquisition fails after retries. Runs after auto sign-out. |
| `timeoutMs`     | `number`                      | ⏺        | Request timeout in milliseconds. Defaults to `20000`.                                             |
| `onTimeout`     | `(route: string) => void`     | ⏺        | Optional callback triggered when a request exceeds the timeout.                                   |
| `headers`       | `Record<string, string>`      | ⏺        | Default custom headers for each request.                                                          |

---

## ✅ Supported Methods

The `HttpClient` exposes standard HTTP methods with TypeScript generics:

```ts
api.get<T>(route: string, config?)
api.post<T>(route: string, config?)
api.put<T>(route: string, config?)
api.patch<T>(route: string, config?)
api.delete<T>(route: string, config?)
```

---

## ⚡ How it works

-   All requests automatically prepend the `baseURL`
-   `HttpClient` handles JSON, `FormData`, `Blob`, and file responses automatically
-   If `authInstance` is provided, a valid Firebase JWT is added to requests automatically

---

## 🛑 Timeouts

When a request takes longer than `timeoutMs`:

-   It is aborted with `AbortController`
-   The optional `onTimeout` callback runs with the route

---

## 🔒 Authentication

-   If your Firebase session is expired or invalid, `HttpClient` will retry up to 3 times.
-   If the session is still invalid, it signs the user out automatically and throws a localized error.
-   You can localize all internal errors with the `language` option (`en`, `ka`, `sv`).

---

## 📣 Feedback & Contributions

This library is under active development!  
Feedback, issues, and pull requests are welcome. 🚀

---
