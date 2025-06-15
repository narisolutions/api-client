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
            entry: path.resolve(__dirname, "src/index.ts"),
            name: "api-client",
            fileName: format => `index.${format}.js`,
            formats: ["es"],
        },
        sourcemap: false,
        emptyOutDir: true,
        rollupOptions: {
            external: ["firebase"],
            output: {
                globals: {
                    firebase: "firebase",
                },
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
