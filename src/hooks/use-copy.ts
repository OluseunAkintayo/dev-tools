import { useToast } from "@/hooks/use-toast";

/**
 * Copies text to the clipboard. Success is shown inline by the caller
 * (see CopyButton); only failures raise a toast.
 */
export const useCopy = () => {
  const { toast } = useToast();
  return async (text: string): Promise<boolean> => {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      toast({
        title: "Could not copy to the clipboard",
        description: "Select the text and copy it manually.",
        variant: "destructive",
      });
      return false;
    }
  };
};
