import React from "react";
import LandingPageLayout from "@/components/LandingPageLayout";
import IconButton from "@/components/IconButton";
import FileUploadButton from "@/components/FileUploadButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Download, RefreshCcw, X } from "lucide-react";
import { flattenNestedObject } from "@/lib/flattenNestedObject";
import { toCsv } from "@/lib/csv";
import { downloadFile, hasExtension, readFileAsText } from "@/lib/download";

interface CsvResult {
  headers: string[];
  rows: string[][];
  csv: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toCell = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const JsonToCsv = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [jsonData, setJsonData] = React.useState<string>("");
  const [jsonFile, setJsonFile] = React.useState<File | null>(null);
  const [result, setResult] = React.useState<CsvResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);

  const convert = () => {
    setError(null);
    if (!jsonData.trim()) {
      setError("Please enter valid JSON data.");
      return;
    }

    try {
      const parsedData: unknown = JSON.parse(jsonData);
      const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData];

      if (dataArray.length === 0 || !dataArray.every(isPlainObject)) {
        setResult(null);
        setError("JSON must be an object or a non-empty array of objects.");
        return;
      }

      const flattenedData = dataArray.map((item) => flattenNestedObject(item));
      const headers = Array.from(new Set(flattenedData.flatMap((item) => Object.keys(item))));
      const rows = flattenedData.map((item) => headers.map((header) => toCell(item[header])));
      setResult({ headers, rows, csv: toCsv(headers, rows) });
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Unable to convert data at this time.");
    }
  };

  const clear = () => {
    setJsonData("");
    setResult(null);
    setJsonFile(null);
    setError(null);
  };

  const handleFileUpload = async (file: File) => {
    clear();
    if (!hasExtension(file, ".json")) {
      setError("Please upload a JSON file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File size is too large. Please upload a file less than 5MB.");
      return;
    }
    setLoading(true);
    try {
      setJsonData(await readFileAsText(file));
      setJsonFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error reading file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LandingPageLayout>
      <div className="px-4 py-8 container">
        <h1 className="text-center text-xl">JSON to CSV Converter</h1>
        <div className="h-8" />
        <div className="space-y-12">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); convert(); }}>
            <div className="space-y-2">
              <Label htmlFor="json-input" className="font-semibold text-slate-700">Enter JSON data</Label>
              <Textarea
                id="json-input"
                className="border border-slate-400 resize-none text-sm"
                placeholder="Paste JSON data here"
                rows={12}
                disabled={loading}
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
              />
              <div className="h-6">
                {jsonFile && <p className="text-xs">{jsonFile.name}</p>}
                {error && <p className="text-destructive text-xs">{error}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 sm:flex gap-2">
              <FileUploadButton
                accept=".json,application/json"
                onFileSelect={handleFileUpload}
                disabled={loading}
                variant="outline"
                className="sm:min-w-[120px]"
              />
              <Button disabled={loading || !jsonData.trim()} className="sm:w-[120px]" type="submit">
                <RefreshCcw /> Convert
              </Button>
              <Button disabled={loading} onClick={clear} className="sm:w-[120px]" type="button" variant="destructive"><X /> Clear</Button>
            </div>
          </form>
          {result && (
            <div>
              <div className="flex gap-8 justify-between">
                <div>
                  <h3 className="font-semibold">CSV data preview</h3>
                  <span className="block mb-4 text-sm">(Showing first 10 rows)</span>
                </div>
                <IconButton label="Download file" onClick={() => downloadFile(result.csv, "csv-data.csv", "text/csv")}><Download /></IconButton>
              </div>
              <Table className="table-auto w-full border-collapse border border-gray-300">
                <TableHeader>
                  <TableRow>
                    {result.headers.map((header, index) => (
                      <TableHead key={index} className="px-4 py-2 border border-gray-300 bg-gray-100">{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.slice(0, 10).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="px-4 py-2 border border-gray-300">{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </LandingPageLayout>
  );
};

export default JsonToCsv;
