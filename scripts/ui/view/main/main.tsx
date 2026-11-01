import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../main.css";
import { loadAppData } from "../../controller/app/SyzygyApp.Controller";
import SyzygyApp from "../app/SyzygyApp";

async function start(): Promise<void> {
    await loadAppData(); // settings, theme and data are ready before anything is drawn
    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            <SyzygyApp />
        </StrictMode>
    );
}

void start();
