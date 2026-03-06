import { BrowserRouter, Routes, Route } from "react-router";
import { createRoot } from "react-dom/client";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  </BrowserRouter>,
);
