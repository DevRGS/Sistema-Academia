import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { SessionContextProvider } from "./contexts/SessionContext.tsx";

createRoot(document.getElementById("root")!).render(
  <SessionContextProvider>
    <App />
  </SessionContextProvider>
);