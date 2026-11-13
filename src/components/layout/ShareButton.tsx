import React from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopy } from "@/hooks/use-copy";
import { useToast } from "@/hooks/use-toast";
import { buildShareUrl, MAX_SHARE_URL_LENGTH } from "@/lib/toolState";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  scope: string;
  /** Mention that keys are left out, for tools that take one. */
  hasSecrets?: boolean;
}

/** Copies a link that reopens this tool with its current inputs. */
export const ShareButton = ({ scope, hasSecrets = false }: ShareButtonProps) => {
  const copy = useCopy();
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number>();

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const share = async () => {
    const result = await buildShareUrl(scope);
    if (!result.ok) {
      toast({
        title: "Too large to share as a link",
        description: `The link would be ${Math.round(result.length / 1000)} kB, and links over ${MAX_SHARE_URL_LENGTH / 1000} kB get cut off by chat apps and some browsers. Download the result and share the file instead.`,
        variant: "destructive",
      });
      return;
    }
    if (!(await copy(result.url))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="outline" size="sm" onClick={share} aria-live="polite">
          <span className="relative grid h-4 w-4 place-items-center">
            <Link2 className={cn("absolute transition-[opacity,filter,transform] duration-200", copied ? "scale-75 opacity-0 blur-[2px]" : "opacity-100")} />
            <Check className={cn("absolute text-brand transition-[opacity,filter,transform] duration-200", copied ? "opacity-100" : "scale-75 opacity-0 blur-[2px]")} />
          </span>
          {copied ? "Link copied" : "Share"}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[30ch]">
        Copies a link with this tool's input. The data is inside the link itself and never sent to a server.{hasSecrets && " Keys and secrets are left out."}
      </TooltipContent>
    </Tooltip>
  );
};
