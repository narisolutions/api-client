export const messages = {
    en: {
        MISSING_BASE_URL: "Missing baseUrl: You must provide a valid API base URL.",
        INVALID_BASE_URL: (value: string) =>
            `Invalid baseUrl: "${value}". It must be a well-formed absolute URL starting with \"http://\" or \"https://\".`,
        INVALID_PROTOCOL: (value: string) =>
            `Invalid baseUrl protocol: "${value}". Only HTTP(S) URLs are supported (e.g. \"https://api.example.com\" or \"http://localhost:3000\").`,
        INVALID_ROUTE: (route: string) =>
            `Invalid route: "${route}". Resolved URL must share the configured baseUrl origin.`,
        SESSION_EXPIRED: "Your session either has expired or is invalid. Please login again.",
        INVALID_GET_DATA: (method: string) =>
            `Invalid method call. Can't pass data to ${method} request.`,
        REQUEST_FAILED: (status: number) => `Request failed with status ${status}.`,
        RESPONSE_TOO_LARGE: (size: number, max: number) =>
            `Response body (${size} bytes) exceeds the configured maxResponseBytes (${max}).`,
    },
    ka: {
        MISSING_BASE_URL: "baseUrl არ არის მითითებული. გთხოვთ მიუთითოთ სწორი API მისამართი.",
        INVALID_BASE_URL: (value: string) =>
            `არასწორი baseUrl: \"${value}\". საჭიროა სწორი URL მისამართი, რომელიც იწყება http:// ან https://.`,
        INVALID_PROTOCOL: (value: string) =>
            `არასწორი პროტოკოლი baseUrl-ში: \"${value}\". მხარდაჭერილია მხოლოდ HTTP(S) (მაგ: \"https://api.example.com\" ან \"http://localhost:3000\").`,
        INVALID_ROUTE: (route: string) =>
            `არასწორი მარშრუტი: \"${route}\". მიღებული URL უნდა ემთხვეოდეს baseUrl-ის origin-ს.`,
        SESSION_EXPIRED: "თქვენი სესია ამოიწურა ან არასწორია. გთხოვთ, ხელახლა შეხვიდეთ სისტემაში.",
        INVALID_GET_DATA: (method: string) =>
            `არასწორი მოთხოვნა. ${method} მეთოდს data ვერ გადაეცემა.`,
        REQUEST_FAILED: (status: number) => `მოთხოვნა წარუმატებელია. სტატუსი ${status}.`,
        RESPONSE_TOO_LARGE: (size: number, max: number) =>
            `პასუხის ზომა (${size} ბაიტი) აჭარბებს კონფიგურირებულ maxResponseBytes-ს (${max}).`,
    },
    sv: {
        MISSING_BASE_URL: "baseUrl saknas: Du måste ange en giltig API-basadress.",
        INVALID_BASE_URL: (value: string) =>
            `Ogiltig baseUrl: \"${value}\". Det måste vara en korrekt absolut URL som börjar med \"http://\" eller \"https://\".`,
        INVALID_PROTOCOL: (value: string) =>
            `Ogiltigt protokoll i baseUrl: \"${value}\". Endast HTTP(S) stöds (t.ex. \"https://api.example.com\" eller \"http://localhost:3000\").`,
        INVALID_ROUTE: (route: string) =>
            `Ogiltig route: \"${route}\". Den slutliga URL:en måste dela baseUrl:ens origin.`,
        SESSION_EXPIRED: "Din session har gått ut eller är ogiltig. Vänligen logga in igen.",
        INVALID_GET_DATA: (method: string) =>
            `Felaktigt anrop. Du kan inte skicka data med en ${method}-förfrågan.`,
        REQUEST_FAILED: (status: number) => `Förfrågan misslyckades med status ${status}.`,
        RESPONSE_TOO_LARGE: (size: number, max: number) =>
            `Svarskroppen (${size} byte) överskrider konfigurerat maxResponseBytes (${max}).`,
    },
} as const;

export type LanguageCode = keyof typeof messages;
