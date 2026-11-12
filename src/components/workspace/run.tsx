import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { modKey } from "@/lib/platform";

interface RunButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

export const RunButton = ({ label, icon: Icon, onClick, disabled }: RunButtonProps) => (
  <Button type="button" size="sm" onClick={onClick} disabled={disabled} className="pr-1.5">
    <Icon />
    {label}
    <kbd className="kbd ml-0.5 border-primary-foreground/25 bg-transparent text-primary-foreground/70">{modKey}↵</kbd>
  </Button>
);

export const ClearButton = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <Button type="button" variant="ghost" size="sm" onClick={onClick} disabled={disabled}>
    <X /> Clear
  </Button>
);
