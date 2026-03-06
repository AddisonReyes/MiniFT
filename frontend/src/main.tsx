import { BrowserRouter, Routes, Route } from "react-router";
import { createRoot } from "react-dom/client";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Home from "./pages/Home";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </BrowserRouter>,
);
