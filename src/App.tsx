import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/providers/AppContext";
import { Providers } from "@/providers/Providers";
import WhatsNew from "@/components/WhatsNew";
import Home from "@/pages/Home";
import Check from "@/pages/Check";
import Rhyme from "@/pages/Rhyme";

// Lazy-loaded so Tone.js only ships in the /pad chunk.
const Pad = lazy(() => import("@/pages/Pad"));

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Providers>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/check" element={<Check />} />
            <Route path="/rhyme" element={<Rhyme />} />
            <Route
              path="/pad"
              element={
                <Suspense fallback={null}>
                  <Pad />
                </Suspense>
              }
            />
          </Routes>
          <WhatsNew />
        </Providers>
      </AppProvider>
    </BrowserRouter>
  );
}
