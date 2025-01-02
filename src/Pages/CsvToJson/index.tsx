import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, RefreshCcw, Upload, X } from "lucide-react";
import LandingPageLayout from "@/components/LandingPageLayout";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast";

const CsvToJson = () => {
  const toast = useToast().toast;
  const [loading, setLoading] = React.useState<boolean>(false);
  const [csvData, setCsvData] = React.useState<string>("");
  const [jsonData, setJsonData] = React.useState<string>("");

  const [, setError] = React.useState<string | null>(null);
  const [delimiter, setDelimiter] = React.useState<string>(",");
  const [csvFile, setCsvFile] = React.useState<File | null>(null);

  const convert = () => {
    try {
      const rows = csvData.split("\n").map((row) => row.trim()).filter((row) => row !== "");
      const regex = new RegExp(`(?:[^"${delimiter}"]|"(?:[^"]|"")*")+`, "g");
      const headers = rows[0].match(regex)?.map((header) => header.replace(/"/g, ""));
      if (!headers) {
        setError("Invalid CSV format! Please check your data.");
        return;
      }

      const json = rows.slice(1).map((row) => {
        const values = row.match(regex)?.map((value) => value.replace(/"/g, ""));
        const obj: Record<string, string> = {};
        if (values) {
          headers.forEach((header, index) => {
            obj[header] = values[index];
          });
        }
        return obj;
      });

      setJsonData(JSON.stringify(json, null, 2)); // Format JSON with indentation
      setError(null);
    } catch (err) {
      console.log({ err });
      setError("Invalid CSV format! Please check your data.");
    }
  };

  const clear = () => {
    // setCsvData("");
    // setJsonData("");
    // setError(null);
    // setCsvFile(null);
    window.location.reload();
  };

  const handleDelimiterChange = (e: React.ChangeEvent<HTMLInputElement>) => setDelimiter(e.target.value);

  const download = () => {
    if (!jsonData) return;
    setLoading(true);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "json-data.json");
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
    setLoading(false);
  };

  const copy = async () => {
    if (!jsonData) return;
    await navigator.clipboard.writeText(jsonData);
    toast({
      title: "Copied to clipboard!",
      className: 'top-0 right-0 flex fixed md:max-w-[320px] md:top-4 md:right-4'
    });
  }

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) {
      return;
    }
    setLoading(true);
    setCsvFile(file);
    if (jsonData) setJsonData("");
    const reader = new FileReader();
    reader.onload = () => {
      const fileContent = reader.result as string;
      setCsvData(fileContent);
    };
    reader.readAsText(file);
    reader.onloadend = () => {
      setLoading(false);
    }
    return;
  };

  return (
    <LandingPageLayout>
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-xl text-center">CSV to JSON Converter</h1>
        <div className="h-8" />

        <form className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold">Delimiter:</Label>
            <Input
              type="text"
              value={delimiter}
              onChange={handleDelimiterChange}
              placeholder="Enter delimiter (e.g., , ; tab)"
              className="border border-slate-400"
            />
          </div>
          <div className="mb-4 flex items-end gap-4">
            <div>
              <Button variant="outline" className="p-0 border-0" type="button">
                <Label role="button" className="flex items-center gap-2 justify-center px-4 h-10 border border-slate-400 rounded-md sm:w-[120px] cursor-pointer text-primary hover:bg-primary/5" htmlFor="file">
                  <Upload className="w-4 h-4" />
                  Upload
                </Label>
              </Button>
              <input
                id="file"
                type="file"
                accept=".csv"
                onChange={upload}
                className="border border-slate-400 hidden"
              />
            </div>
            <span className="text-slate-500 italic">{csvFile ? csvFile.name : "No file selected"}</span>
          </div>
          <div className="grid grid-cols-3 sm:flex gap-2">
            <Button disabled={loading || !csvFile} onClick={convert} className="sm:w-[120px]" type="button"><RefreshCcw /> Convert</Button>
            <Button disabled={loading} onClick={clear} className="sm:w-[120px]" type="button" variant='destructive'><X /> Clear</Button>
          </div>
        </form>

        {/* {error && <Alert variant="destructive" className="mb-4">{error}</Alert>} */}

        {jsonData && (
          <div className="mt-12">
            <div className="flex items-center justify-between gp-8 mb-4">
              <h3 className="font-semibold">JSON Data</h3>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button variant="outline" disabled={loading || !jsonData} onClick={copy} size="icon" type="button"><Copy /></Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button disabled={loading || !jsonData} onClick={download} size="icon" type="button"><Download /></Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

              </div>
            </div>
            <Textarea
              className="border border-slate-400 p-4"
              readOnly rows={12}
              value={jsonData}
            />
          </div>
        )}
      </div>
    </LandingPageLayout>
  );
};

export default CsvToJson;
