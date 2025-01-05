/* eslint-disable @typescript-eslint/no-explicit-any */
import LandingPageLayout from "@/components/LandingPageLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Download, RefreshCcw, X } from "lucide-react";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


const JsonToCsv = () => {
  const [jsonData, setJsonData] = React.useState<string>("");
  const [csvData, setCsvData] = React.useState<string | null>("");
  const [error, setError] = React.useState<string | null>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  const flattenObject = (obj: Record<string, any>, prefix = ""): Record<string, any> => {
    return Object.keys(obj).reduce((acc, key) => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Recursively flatten
        Object.assign(acc, flattenObject(value, newKey));
      } else {
        acc[newKey] = value;
      }
      return acc;
    }, {} as Record<string, any>);
  };

  const convert = async () => {
    setLoading(true);
    if (error) setError(null);

    try {
      const parsedData = JSON.parse(jsonData);

      if (typeof parsedData !== "object" || parsedData === null) {
        setError("Invalid JSON data! Please check your data and try again.");
        setLoading(false);
        return;
      }

      const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData]; // Ensure array
      console.log({ dataArray });

      // Flatten all objects in the array
      const flattenedData = dataArray.map((item) => flattenObject(item));

      const headers = Array.from(
        new Set(flattenedData.flatMap((item) => Object.keys(item)))
      );

      const rows = flattenedData.map((item) =>
        headers.map((header) => (item[header] !== undefined ? item[header] : "")).join(",")
      );

      // Construct CSV output
      const convertedData = `${headers.join(",")}\n${rows.join("\n")}`;
      setTimeout(() => {
        setCsvData(convertedData)
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.log({ error });
      setError(error instanceof Error ? error.message : "Unable to convert data at this time.");
    }
  };

  const clear = () => {
    if (jsonData) setJsonData("");
    if (csvData) setCsvData(null);
    if (error) setError(null);
  }

  const [headers, ...rows] = (csvData ?? "").split("\n").map((line) => line.split(","));

  const download = () => {
    if (!csvData || csvData.trim() === "") return;
    setLoading(true);

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "csv-data.csv");
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
    setLoading(false);
    // setTimeout(() => clear(), 1000);
  }

  return (
    <LandingPageLayout>
      <div>
        <h1 className="text-center text-xl">JSON to CSV Converter</h1>
        <div className="h-8" />
        <div className="space-y-8">
          <form className="space-y-4">
            <div className="">
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">Enter JSON data</Label>
                <Textarea
                  className="border border-slate-400 resize-none"
                  placeholder="Paste JSON data here"
                  rows={12}
                  disabled={loading}
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                />
                <div className="h-6">
                  {error && <p className="text-destructive text-sm">{error}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 sm:flex gap-2">
                <Button disabled={loading} onClick={convert} className="sm:w-[120px]" type="button">
                  {loading ? <RefreshCcw className="animate-spin" /> : <><RefreshCcw /> Convert</>}
                </Button>
                <Button disabled={loading} onClick={clear} className="sm:w-[120px]" type="button" variant='destructive'><X /> Clear</Button>
              </div>
            </div>
          </form>
          <div>
            {
              csvData && (
                <div>
                  <div className="flex gap gap-8 justify-between">
                    <div>
                      <h3 className="font-semibold">CSV data preview</h3>
                      <span className="block mb-4 text-sm">(Showing first 10 rows)</span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button disabled={loading || !csvData} onClick={download} size="icon" type="button"><Download /></Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download file</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Table className="table-auto w-full border-collapse border border-gray-300">
                    <TableHeader>
                      <TableRow>
                        {headers.map((header, index) => (
                          <TableHead key={index} className="px-4 py-2 border border-gray-300 bg-gray-100">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, 10).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="px-4 py-2 border border-gray-300">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </LandingPageLayout>
  )
}

export default JsonToCsv;
