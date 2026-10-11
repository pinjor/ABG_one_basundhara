import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ToastProvider } from "./components/ui/Toast";
import { applyPrefs, type Lang, type ThemeName } from "./lib/prefs";
import "./index.css";

try {
  const saved = JSON.parse(localStorage.getItem("bsc-prefs") ?? "{}") as { state?: { lang?: Lang; theme?: ThemeName } };
  applyPrefs(saved.state?.lang === "bn" ? "bn" : "en", saved.state?.theme === "light" ? "light" : "dark");
} catch {
  applyPrefs("en", "dark");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
