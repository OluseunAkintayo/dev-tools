import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Signing error or weak-secret warning under the key field in Encode mode. */
export const KeyNotice = ({ message, kind }: { message: string | null; kind: "error" | "warn" | null }) =>
  message ? (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2 border-t border-line px-4 py-2.5 text-[13px] leading-5", kind === "error" ? "text-destructive" : "text-warn")}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  ) : null;
