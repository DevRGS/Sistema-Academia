import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { SessionContextProvider } from "./contexts/SessionContext.tsx";
import { HashRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <SessionContextProvider>
      <App />
    </SessionContextProvider>
  </HashRouter>
);