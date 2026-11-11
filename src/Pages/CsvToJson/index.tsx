import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, RefreshCcw, X } from "lucide-react";
import LandingPageLayout from "@/components/LandingPageLayout";
import IconButton from "@/components/IconButton";
import FileUploadButton from "@/components/FileUploadButton";
import { useCopy } from "@/hooks/use-copy";
import { csvToObjects } from "@/lib/csv";
import { downloadFile, hasExtension, readFileAsText } from "@/lib/download";

const CsvToJson = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const copy = useCopy();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [csvData, setCsvData] = React.useState<string>("");
  const [jsonData, setJsonData] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [delimiter, setDelimiter] = React.useState<string>(",");
  const [csvFile, setCsvFile] = React.useState<File | null>(null);

  const convert = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const actualDelimiter = delimiter === "\\t" ? "\t" : delimiter;
      if (actualDelimiter.length !== 1) {
        setError("Delimiter must be a single character (use \\t for tab).");
        return;
      }
      if (!csvData.trim()) {
        setError("Please provide CSV data.");
        return;
      }
      setJsonData(JSON.stringify(csvToObjects(csvData, actualDelimiter), null, 2));
    } catch (err) {
      setJsonData("");
      setError(err instanceof Error ? err.message : "Invalid CSV format! Please check your data.");
    }
  };

  const clear = () => {
    setCsvData("");
    setJsonData("");
    setError(null);
    setCsvFile(null);
  };

  const upload = async (file: File) => {
    setJsonData("");
    setError(null);
    setCsvFile(null);
    if (!hasExtension(file, ".csv", ".tsv", ".txt")) {
      setError("Invalid file type! Please upload a CSV file.");
      return;
    }
    setLoading(true);
    try {
      setCsvData(await readFileAsText(file));
      setCsvFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error reading file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LandingPageLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-xl text-center">CSV to JSON Converter</h1>
        <div className="h-8" />
        <div className="sm:max-w-[600px] mx-auto">
          <form onSubmit={convert} className="space-y-4">
            <Tabs defaultValue="upload">
              <TabsList className="w-full">
                <TabsTrigger className="w-full" value="upload">Upload CSV File</TabsTrigger>
                <TabsTrigger className="w-full" value="paste">Paste CSV</TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="pt-4 space-y-2">
                <Label>Upload CSV File</Label>
                <FileUploadButton
                  accept=".csv,.tsv,.txt,text/csv"
                  onFileSelect={upload}
                  disabled={loading}
                  className="w-full bg-slate-200 hover:bg-slate-200/80 text-slate-700"
                />
                {csvFile && <span className="block text-xs text-slate-500">{csvFile.name}</span>}
              </TabsContent>
              <TabsContent value="paste" className="pt-4">
                <Textarea
                  aria-label="CSV data"
                  value={csvData}
                  rows={12}
                  onChange={(e) => setCsvData(e.target.value)}
                  className="text-xs"
                  placeholder="Paste your CSV data here..."
                />
              </TabsContent>
            </Tabs>
            <div className="h-4">
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="delimiter">Delimiter</Label>
              <Input id="delimiter" type="text" value={delimiter} onChange={(e) => setDelimiter(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={loading || !csvData.trim()} type="submit">
                <RefreshCcw /> Convert
              </Button>
              <Button disabled={loading} type="button" onClick={clear} variant="destructive"><X /> Clear</Button>
            </div>
          </form>
        </div>

        {jsonData && (
          <div className="mt-12">
            <div className="flex items-center justify-between gap-8 mb-4">
              <h3 className="font-semibold">JSON Data</h3>
              <div className="flex gap-2">
                <IconButton label="Copy" className="border border-slate-400" variant="outline" onClick={() => copy(jsonData)}><Copy /></IconButton>
                <IconButton label="Download file" onClick={() => downloadFile(jsonData, "json-data.json", "application/json")}><Download /></IconButton>
              </div>
            </div>
            <Textarea className="border border-slate-400 p-4 text-sm" readOnly rows={12} value={jsonData} />
          </div>
        )}
      </div>
    </LandingPageLayout>
  );
};

export default CsvToJson;
