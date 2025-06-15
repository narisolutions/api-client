export const messages = {
    en: {
        MISSING_BASE_URL: "Missing baseURL: You must provide a valid API base URL.",
        INVALID_BASE_URL: (value: string) =>
            `Invalid baseURL: "${value}". It must be a well-formed absolute URL starting with \"http://\" or \"https://\".`,
        INVALID_PROTOCOL: (value: string) =>
            `Invalid baseURL protocol: "${value}". Only HTTP(S) URLs are supported (e.g. \"https://api.example.com\" or \"http://localhost:3000\").`,
        SESSION_EXPIRED: "Your session either has expired or is invalid. Please login again.",
        INVALID_GET_DATA: (method: string) =>
            `Invalid method call. Can't pass data to ${method} request.`,
    },
    ka: {
        MISSING_BASE_URL: "baseURL არ არის მითითებული. გთხოვთ მიუთითოთ სწორი API მისამართი.",
        INVALID_BASE_URL: (value: string) =>
            `არასწორი baseURL: \"${value}\". საჭიროა სწორი URL მისამართი, რომელიც იწყება http:// ან https://.`,
        INVALID_PROTOCOL: (value: string) =>
            `არასწორი პროტოკოლი baseURL-ში: \"${value}\". მხარდაჭერილია მხოლოდ HTTP(S) (მაგ: \"https://api.example.com\" ან \"http://localhost:3000\").`,
        SESSION_EXPIRED: "თქვენი სესია ამოიწურა ან არასწორია. გთხოვთ, ხელახლა შეხვიდეთ სისტემაში.",
        INVALID_GET_DATA: (method: string) =>
            `არასწორი მოთხოვნა. ${method} მეთოდს data ვერ გადაეცემა.`,
    },
    sv: {
        MISSING_BASE_URL: "baseURL saknas: Du måste ange en giltig API-basadress.",
        INVALID_BASE_URL: (value: string) =>
            `Ogiltig baseURL: \"${value}\". Det måste vara en korrekt absolut URL som börjar med \"http://\" eller \"https://\".`,
        INVALID_PROTOCOL: (value: string) =>
            `Ogiltigt protokoll i baseURL: \"${value}\". Endast HTTP(S) stöds (t.ex. \"https://api.example.com\" eller \"http://localhost:3000\").`,
        SESSION_EXPIRED: "Din session har gått ut eller är ogiltig. Vänligen logga in igen.",
        INVALID_GET_DATA: (method: string) =>
            `Felaktigt anrop. Du kan inte skicka data med en ${method}-förfrågan.`,
    },
} as const;

export type LanguageCode = keyof typeof messages;
