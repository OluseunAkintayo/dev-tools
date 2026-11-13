import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./tw.css";
import App from "./App.tsx";
import { Toaster } from "./components/ui/toaster.tsx";
import { UpdatePrompt } from "./components/layout/UpdatePrompt.tsx";
import { ThemeProvider } from "./hooks/use-theme.tsx";
import { toast } from "./hooks/use-toast.ts";
import { loadSharedState, stripFragment } from "./lib/toolState.ts";
import { Analytics } from "@vercel/analytics/react";

// A share link keeps its data after "#". Decode it (and clear it from the address bar)
// before the first render, so the tool mounts with the shared input already in place.
loadSharedState().then((result) => {
  createRoot(document.getElementById("BS2GHRGSXY")!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
        <Toaster />
        <UpdatePrompt />
      </ThemeProvider>
      {/* Never report the fragment, even though the app has already removed it. */}
      <Analytics beforeSend={(event) => ({ ...event, url: stripFragment(event.url) })} />
    </StrictMode>
  );
  if (result === "invalid") {
    toast({ title: "This share link couldn't be opened", description: "It may have been cut off when it was copied. Ask for the link again.", variant: "destructive" });
  }
});
