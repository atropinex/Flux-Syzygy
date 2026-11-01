import {resolve} from "path";
import react from "@vitejs/plugin-react";
import {defineConfig, externalizeDepsPlugin} from "electron-vite";

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin({exclude: ["yaml"]})],
        build: {
            rollupOptions: {input: {mainindex: resolve(__dirname, "scripts/ui/mainindex.ts")}}
        }
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {input: {preloadindex: resolve(__dirname, "scripts/preload/preloadindex.ts")}}
        }
    },
    renderer: {
        root: resolve(__dirname, "scripts/ui"),
        plugins: [react()],
        css: {modules: {localsConvention: "camelCaseOnly"}},
        build: {
            rollupOptions: {input: {index: resolve(__dirname, "scripts/ui/index.html")}}
        }
    }
});
