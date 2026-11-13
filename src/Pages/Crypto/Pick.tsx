import { ToolbarLabel } from "@/components/workspace/Workspace";
import { SELECT_CLASS } from "./shared";

interface PickProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** A labelled dropdown for the toolbar. */
export function Pick<T extends string>({ id, label, value, options, onChange }: PickProps<T>) {
  return (
    <div className="flex items-center gap-2">
      <ToolbarLabel htmlFor={id}>{label}</ToolbarLabel>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)} className={SELECT_CLASS}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
