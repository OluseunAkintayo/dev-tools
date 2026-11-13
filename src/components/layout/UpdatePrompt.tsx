import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

/** Check for a new version this often while the app stays open. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Registers the service worker. Says once when the app is ready to work offline, and
 * when a new version is available, offers a reload instead of reloading by itself.
 */
export const UpdatePrompt = () => {
  const { toast } = useToast();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) window.setInterval(() => registration.update(), UPDATE_CHECK_MS);
    },
  });

  React.useEffect(() => {
    if (!offlineReady) return;
    toast({ title: "Ready to work offline", description: "NexTools is saved on this device. Every tool now works without a connection." });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, toast]);

  React.useEffect(() => {
    if (!needRefresh) return;
    toast({
      title: "A new version is available",
      description: "Reload to update. Anything you've typed in a tool will be cleared.",
      duration: Number.POSITIVE_INFINITY,
      action: (
        <ToastAction altText="Reload to update NexTools" onClick={() => updateServiceWorker(true)}>
          Reload
        </ToastAction>
      ),
      onOpenChange: (open) => !open && setNeedRefresh(false),
    });
  }, [needRefresh, setNeedRefresh, toast, updateServiceWorker]);

  return null;
};
