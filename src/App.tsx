import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/providers/AppContext";
import { Providers } from "@/providers/Providers";
import Home from "@/pages/Home";
import Check from "@/pages/Check";
import Rhyme from "@/pages/Rhyme";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Providers>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/check" element={<Check />} />
            <Route path="/rhyme" element={<Rhyme />} />
          </Routes>
        </Providers>
      </AppProvider>
    </BrowserRouter>
  );
}
