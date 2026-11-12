import React from "react";
import { Check, ClipboardPaste, Copy, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopy } from "@/hooks/use-copy";
import { useShortcut } from "@/hooks/use-shortcut";
import { downloadFile } from "@/lib/download";
import { modKey } from "@/lib/platform";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  /** Bind ⌘⇧↵ (Ctrl+Shift+Enter) to copy. Enable on one button per page. */
  shortcut?: boolean;
}

/** Copy with inline confirmation: the icon morphs to a check, softened with a brief blur. */
export const CopyButton = ({ text, shortcut = false }: CopyButtonProps) => {
  const copy = useCopy();
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number>();

  const doCopy = async () => {
    if (!(await copy(text))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  useShortcut({ key: "Enter", mod: true, shift: true, enabled: shortcut && Boolean(text) }, doCopy);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={!text} onClick={doCopy} aria-live="polite">
          <span className="relative grid h-4 w-4 place-items-center">
            <Copy className={cn("absolute transition-[opacity,filter,transform] duration-200", copied ? "scale-75 opacity-0 blur-[2px]" : "opacity-100")} />
            <Check className={cn("absolute text-brand transition-[opacity,filter,transform] duration-200", copied ? "opacity-100" : "scale-75 opacity-0 blur-[2px]")} />
          </span>
          {copied ? "Copied" : "Copy"}
        </Button>
      </TooltipTrigger>
      {shortcut && <TooltipContent>Copy result ({modKey}⇧↵)</TooltipContent>}
    </Tooltip>
  );
};

interface DownloadButtonProps {
  content: string;
  filename: string;
  mimeType: string;
}

export const DownloadButton = ({ content, filename, mimeType }: DownloadButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!content}
        aria-label={`Download ${filename}`}
        onClick={() => downloadFile(content, filename, mimeType)}
      >
        <Download />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Download {filename}</TooltipContent>
  </Tooltip>
);

interface OpenFileButtonProps {
  accept: string;
  onFile: (file: File) => void;
  disabled?: boolean;
  label?: string;
  variant?: "outline" | "default";
}

export const OpenFileButton = ({ accept, onFile, disabled, label = "Open file", variant = "outline" }: OpenFileButtonProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <Button type="button" variant={variant} size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <Upload /> <span className="hidden sm:inline">{label}</span>
      </Button>
    </>
  );
};

/** Paste from the clipboard into the input. Hidden where the Clipboard API cannot read. */
export const PasteButton = ({ onPaste }: { onPaste: (text: string) => void }) => {
  const supported = typeof navigator !== "undefined" && Boolean(navigator.clipboard?.readText);
  if (!supported) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) onPaste(text);
        } catch {
          // Permission denied: the user can still paste with the keyboard.
        }
      }}
    >
      <ClipboardPaste /> <span className="hidden sm:inline">Paste</span>
    </Button>
  );
};
