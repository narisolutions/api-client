# ⚠️ Warning!

This library is **fresh** and still under active development.

**Current status:**

-   Supports only **Firebase JWT authentication**
-   Designed as a lightweight, TypeScript-first alternative to [axios](https://www.npmjs.com/package/axios)
-   Smaller bundle size, focused on covering the most common API request scenarios
-   Will become more sophisticated over time

## Installation

Using npm

```bash
npm install @narisolutions/api-client
```

Using yarn

```bash
yarn add @narisolutions/api-client
```

## JavaScript

```js
import { HttpClient } from "@narisolutions/api-client";

const api = new HttpClient({ baseURL: "https://api.example.com/v1" });

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
import { HttpClient } from "@narisolutions/api-client";

const api = new HttpClient({ baseURL: "https://api.example.com/v1" });

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
