import React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Row {
  id: number;
  key: string;
  value: string;
}

interface ParamsTableProps {
  /** Decoded parameters from the current URL. */
  params: [string, string][];
  /** Called with every edit, including blank rows, which the URL leaves out. */
  onChange: (params: [string, string][]) => void;
  disabled?: boolean;
}

const cellClass =
  "h-8 w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 font-mono text-[13px] text-ink outline-none placeholder:font-sans placeholder:text-ink-4 hover:border-line focus-visible:border-brand/60 focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-60";

/**
 * Decoded query parameters as editable rows. Rows keep their own ids so focus stays put
 * while typing, and blank rows survive locally until filled in.
 */
export const ParamsTable = ({ params, onChange, disabled = false }: ParamsTableProps) => {
  const nextId = React.useRef(0);
  const toRows = (pairs: [string, string][]) => pairs.map(([key, value]) => ({ id: nextId.current++, key, value }));
  const [rows, setRows] = React.useState<Row[]>(() => toRows(params));

  // Follow the URL when it changes from outside the table (typing in the URL field).
  const incoming = JSON.stringify(params);
  React.useEffect(() => {
    setRows((current) => {
      const filled = current.filter((row) => row.key !== "" || row.value !== "").map((row) => [row.key, row.value]);
      return JSON.stringify(filled) === incoming ? current : toRows(JSON.parse(incoming));
    });
  }, [incoming]);


  const update = (next: Row[]) => {
    setRows(next);
    onChange(next.map((row) => [row.key, row.value]));
  };

  const edit = (id: number, field: "key" | "value", text: string) => update(rows.map((row) => (row.id === id ? { ...row, [field]: text } : row)));

  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-0 text-left text-[13px]">
        <thead>
          <tr className="text-[12px] text-ink-3">
            <th scope="col" className="w-[38%] border-b border-line px-3 py-2 font-medium">
              Key
            </th>
            <th scope="col" className="border-b border-line px-3 py-2 font-medium">
              Value <span className="font-normal text-ink-4">(decoded)</span>
            </th>
            <th scope="col" className="w-10 border-b border-line">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td className="border-b border-line/70 px-1.5 py-1">
                <input aria-label={`Key ${index + 1}`} value={row.key} onChange={(event) => edit(row.id, "key", event.target.value)} placeholder="key" disabled={disabled} spellCheck={false} className={cellClass} />
              </td>
              <td className="border-b border-line/70 px-1.5 py-1">
                <input aria-label={`Value ${index + 1}`} value={row.value} onChange={(event) => edit(row.id, "value", event.target.value)} placeholder="value" disabled={disabled} spellCheck={false} className={cellClass} />
              </td>
              <td className="border-b border-line/70 py-1 pr-1.5 text-right">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove ${row.key || `row ${index + 1}`}`} disabled={disabled} onClick={() => update(rows.filter((item) => item.id !== row.id))}>
                  <X />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="px-3 py-3 text-[13px] text-ink-3">This URL has no query parameters.</p>}
      <div className="px-1.5 py-2">
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => update([...rows, { id: nextId.current++, key: "", value: "" }])}>
          <Plus /> Add parameter
        </Button>
      </div>
    </div>
  );
};
