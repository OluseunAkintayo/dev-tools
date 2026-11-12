import type { CsvResult } from "@/lib/jsonToCsv";

/** Rows rendered in the table preview; Copy and Download always include every row. */
const PREVIEW_ROWS = 100;

export const DataTable = ({ result, dimmed }: { result: CsvResult; dimmed: boolean }) => (
  <div className={`h-full overflow-auto transition-opacity duration-200 ${dimmed ? "opacity-45" : ""}`}>
    <table className="w-max min-w-full border-separate border-spacing-0 text-left text-[13px]">
      <thead>
        <tr>
          <th className="sticky left-0 top-0 z-20 border-b border-r border-line bg-gutter px-3 py-2 text-right font-mono text-[12px] font-normal text-ink-4">#</th>
          {result.headers.map((header) => (
            <th key={header} className="sticky top-0 z-10 whitespace-nowrap border-b border-line bg-gutter px-3 py-2 font-mono text-[12px] font-medium text-ink">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.slice(0, PREVIEW_ROWS).map((row, rowIndex) => (
          <tr key={rowIndex} className="hover:bg-sunken/50">
            <td className="sticky left-0 border-r border-line bg-gutter px-3 py-2 text-right font-mono text-[12px] text-ink-4">{rowIndex + 1}</td>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="max-w-[320px] truncate whitespace-nowrap border-b border-line/70 px-3 py-2 text-ink-2" title={cell}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    {result.rows.length > PREVIEW_ROWS && (
      <p className="px-4 py-3 text-[12px] text-ink-3">
        Showing the first {PREVIEW_ROWS} of {result.rows.length.toLocaleString()} rows. Copy or download to get all of them.
      </p>
    )}
  </div>
);
