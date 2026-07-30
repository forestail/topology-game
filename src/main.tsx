import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import App from "./App";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Topology root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
