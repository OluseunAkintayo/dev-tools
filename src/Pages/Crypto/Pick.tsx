import { Dropdown } from "@/components/workspace/Dropdown";
import { ToolbarLabel } from "@/components/workspace/Workspace";

interface PickProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function Pick<T extends string>({ id, label, value, options, onChange }: PickProps<T>) {
  return (
    <div className="flex items-center gap-2">
      <ToolbarLabel htmlFor={id}>{label}</ToolbarLabel>
      <Dropdown id={id} label={label} value={value} options={options} onChange={onChange} />
    </div>
  );
}
