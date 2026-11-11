import React from "react";
import LandingPageLayout from "@/components/LandingPageLayout";
import IconButton from "@/components/IconButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, RefreshCcw, X } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { downloadFile } from "@/lib/download";

type Indent = "2" | "4" | "tab";

const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeysDeep((value as Record<string, unknown>)[key])])
    );
  }
  return value;
};

const JsonFormatter = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const copy = useCopy();
  const [rawData, setRawData] = React.useState<string>("");
  const [formattedData, setFormattedData] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [indent, setIndent] = React.useState<Indent>("2");
  const [sortKeys, setSortKeys] = React.useState<boolean>(false);

  const format = () => {
    setError(null);
    if (!rawData.trim()) {
      setError("Please enter valid JSON data.");
      return;
    }
    try {
      const parsedData: unknown = JSON.parse(rawData);
      const data = sortKeys ? sortKeysDeep(parsedData) : parsedData;
      setFormattedData(JSON.stringify(data, null, indent === "tab" ? "\t" : Number(indent)));
    } catch (err) {
      setFormattedData("");
      setError(err instanceof Error ? err.message : "Unable to format JSON data.");
    }
  };

  const clear = () => {
    setRawData("");
    setFormattedData("");
    setError(null);
  };

  return (
    <LandingPageLayout>
      <div className="px-4 py-8 container">
        <h1 className="text-center text-xl">JSON Formatter</h1>
        <div className="h-8" />
        <div className="space-y-12">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); format(); }}>
            <div className="space-y-2">
              <Label htmlFor="raw-json" className="font-semibold text-slate-700">Enter data to format</Label>
              <Textarea
                id="raw-json"
                className="border border-slate-400 resize-none text-sm"
                placeholder="Paste JSON data here"
                rows={12}
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
              />
              <div className="h-6">
                {error && <p className="text-destructive text-sm">{error}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Label htmlFor="indent">Indentation</Label>
                <select
                  id="indent"
                  value={indent}
                  onChange={(e) => setIndent(e.target.value as Indent)}
                  className="h-9 rounded-md border border-slate-400 bg-background px-2 text-sm"
                >
                  <option value="2">2 spaces</option>
                  <option value="4">4 spaces</option>
                  <option value="tab">Tab</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="sort-keys"
                  type="checkbox"
                  checked={sortKeys}
                  onChange={(e) => setSortKeys(e.target.checked)}
                  className="h-4 w-4 accent-slate-700"
                />
                <Label htmlFor="sort-keys">Sort keys</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2">
              <Button disabled={!rawData.trim()} className="sm:w-[120px]" type="submit">
                <RefreshCcw /> Format
              </Button>
              <Button onClick={clear} className="sm:w-[120px]" type="button" variant="destructive"><X /> Clear</Button>
            </div>
          </form>
          {formattedData && (
            <div>
              <div className="flex gap-8 items-center justify-between">
                <h3 className="font-semibold">Formatted JSON Data</h3>
                <div className="flex gap-2">
                  <IconButton label="Copy content" className="border-slate-300" variant="outline" onClick={() => copy(formattedData)}><Copy /></IconButton>
                  <IconButton label="Download file" onClick={() => downloadFile(formattedData, "json-data.json", "application/json")}><Download /></IconButton>
                </div>
              </div>
              <div className="h-4" />
              <Textarea className="border border-slate-400 resize-none text-sm" rows={15} readOnly value={formattedData} />
            </div>
          )}
        </div>
      </div>
    </LandingPageLayout>
  );
};

export default JsonFormatter;
