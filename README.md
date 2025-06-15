# Warning!

This library is quite fresh and still under development.

Currently, it supports only one type of authentication method, which is Firebase JWT token.

This library is intended to be simple replacement for [axios](https://www.npmjs.com/package/axios). It's much smaller in size and supports most basic needs for handling api requests.

Please note, it's planned to make this library more sophisticated in time.

## Usage

```javascript
import { HttpClient } from "@narisolutions/request";

const api = new HttpClient( { baseURL: "https://api.example.com/v1", ... } );

const getUsers = () => {
    try {
        const users = await api.get("/users");
    }catch(e) {
        ...
    }

}

```

#### TypeScript

```typescript
import { HttpClient } from "@narisolutions/request";

const api = new HttpClient( { baseURL: "https://api.example.com/v1", ... } );

type User = {
    name: string;
    age: number;
}

const getUsers = () => {
    try {
        const users = await api.get<User[]>("/users");
    }catch(e) {
        ...
    }

}

```
