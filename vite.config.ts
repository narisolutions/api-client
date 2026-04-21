import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    build: {
        lib: {
            // Multi-entry: each client has its own bundle so a consumer
            // importing "@narisolutions/api-client/http" physically cannot
            // pull code from a sibling client (e.g. graphql) into their build.
            entry: {
                index: path.resolve(__dirname, "src/index.ts"),
                "http/index": path.resolve(__dirname, "src/http/index.ts"),
                // Future clients slot in here, e.g.:
                // "graphql/index": path.resolve(__dirname, "src/graphql/index.ts"),
            },
            formats: ["es"],
            fileName: (_format, entryName) => `${entryName}.es.js`,
        },
        sourcemap: false,
        emptyOutDir: true,
        rollupOptions: {
            external: [/^firebase(\/|$)/],
            output: {
                format: "es",
            },
        },
    },
    plugins: [
        dts({
            entryRoot: "src",
            outDir: "dist/types",
            include: ["src"],
            cleanVueFileName: true,
        }),
    ],
});
