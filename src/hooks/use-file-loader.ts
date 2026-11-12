import React from "react";
import { useToast } from "@/hooks/use-toast";
import { hasExtension, readFileAsText } from "@/lib/download";
import { formatBytes } from "@/lib/text";

interface FileLoaderOptions {
  extensions: string[];
  maxBytes?: number;
  onLoad: (text: string, file: File) => void;
}

const DEFAULT_MAX = 10 * 1024 * 1024;

/** Reads a chosen or dropped file as text, after checking its extension and size. */
export const useFileLoader = ({ extensions, maxBytes = DEFAULT_MAX, onLoad }: FileLoaderOptions) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const load = async (file: File) => {
    if (!hasExtension(file, ...extensions)) {
      toast({ variant: "destructive", title: `Cannot open ${file.name}`, description: `Choose a ${extensions.join(", ")} file.` });
      return;
    }
    if (file.size > maxBytes) {
      toast({ variant: "destructive", title: `${file.name} is too large`, description: `Files up to ${formatBytes(maxBytes)} are supported.` });
      return;
    }
    setLoading(true);
    try {
      onLoad(await readFileAsText(file), file);
    } catch (err) {
      toast({ variant: "destructive", title: `Could not read ${file.name}`, description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  };

  return { load, loading, accept: extensions.join(",") };
};
