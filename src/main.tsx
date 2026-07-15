import React from "react";
import ReactDOM from "react-dom/client";

// Self-hosted fonts (replaces next/font/google).
import "@fontsource/poppins/100.css";
import "@fontsource/poppins/200.css";
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/poppins/900.css";
import "@fontsource-variable/plus-jakarta-sans";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import "./i18n";
import "./globals.css";

// Dictionary/rhyme entries barely change — cache aggressively so re-searching
// a word (or clicking a related word) is instant and hits no network.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 60 * 1000, // 1 hour
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
