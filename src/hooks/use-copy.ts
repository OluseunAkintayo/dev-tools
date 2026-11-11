import { useToast } from "@/hooks/use-toast";

const toastClassName = "top-0 right-0 flex fixed md:max-w-[320px] md:top-4 md:right-4";

export const useCopy = () => {
  const { toast } = useToast();

  return async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard!", className: toastClassName });
    } catch {
      toast({
        title: "Failed to copy to clipboard",
        description: "Please select and copy the text manually.",
        variant: "destructive",
        className: toastClassName,
      });
    }
  };
};
