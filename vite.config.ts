import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import images from "./src/domain/image-manifest.json";
import { journeySizes } from "./src/domain/image-layout";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "preload-primary-illustration",
      transformIndexHtml() {
        return [
          {
            tag: "link",
            injectTo: "head",
            attrs: {
              rel: "preload",
              as: "image",
              type: "image/avif",
              fetchpriority: "high",
              imagesrcset: images["career-prepare"].avif
                .map((image) => `${image.src} ${image.width}w`)
                .join(", "),
              imagesizes: journeySizes,
            },
          },
        ];
      },
    },
  ],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          storage: ["idb", "zod"],
          dialog: ["@radix-ui/react-dialog"],
        },
      },
    },
  },
});
