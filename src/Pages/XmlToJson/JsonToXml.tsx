import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, RefreshCcw, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LandingPageLayout from "@/components/LandingPageLayout";
import IconButton from "@/components/IconButton";
import FileUploadButton from "@/components/FileUploadButton";
import { useCopy } from "@/hooks/use-copy";
import { downloadFile, hasExtension, readFileAsText } from "@/lib/download";
import { formatXml } from "@/lib/formatXml";
import X2JS from "x2js";

const JsonToXml = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const copy = useCopy();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [jsonData, setJsonData] = React.useState<string>("");
  const [jsonFile, setJsonFile] = React.useState<File | null>(null);
  const [xmlData, setXmlData] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  const convert = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let jsonObj: unknown;
    try {
      jsonObj = JSON.parse(jsonData);
    } catch {
      setXmlData("");
      setError("Invalid JSON format. Please check your input.");
      return;
    }
    if (typeof jsonObj !== "object" || jsonObj === null || Array.isArray(jsonObj)) {
      setXmlData("");
      setError("JSON must be an object, for example {\"root\": {...}}.");
      return;
    }
    try {
      setXmlData(formatXml(new X2JS().js2xml(jsonObj)));
    } catch {
      setXmlData("");
      setError("Conversion failed. Please check your JSON input.");
    }
  };

  const clear = () => {
    setJsonData("");
    setXmlData("");
    setError(null);
    setJsonFile(null);
  };

  const upload = async (file: File) => {
    setXmlData("");
    setError(null);
    setJsonFile(null);
    setJsonData("");
    if (!hasExtension(file, ".json")) {
      setError("Invalid file type! Please upload a .json file.");
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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-xl text-center">JSON to XML Converter</h1>
        <div className="h-8" />
        <div className="sm:max-w-[600px] mx-auto">
          <form onSubmit={convert} className="space-y-4">
            <Tabs defaultValue="upload" className="sm:max-w-[600px] mx-auto">
              <TabsList className="w-full">
                <TabsTrigger className="w-full" value="upload">Upload JSON File</TabsTrigger>
                <TabsTrigger className="w-full" value="paste">Paste JSON</TabsTrigger>
              </TabsList>
              <TabsContent value="paste" className="pt-4">
                <Textarea
                  aria-label="JSON data"
                  value={jsonData}
                  rows={12}
                  onChange={(e) => setJsonData(e.target.value)}
                  className="text-xs"
                  placeholder="Paste your JSON data here..."
                />
              </TabsContent>
              <TabsContent value="upload" className="pt-4 space-y-2">
                <Label>Upload JSON File</Label>
                <FileUploadButton
                  accept=".json,application/json"
                  onFileSelect={upload}
                  disabled={loading}
                  className="w-full bg-slate-200 hover:bg-slate-200/80 text-slate-700"
                >
                  Upload file
                </FileUploadButton>
                {jsonFile && <span className="block text-xs text-slate-500">{jsonFile.name}</span>}
              </TabsContent>
            </Tabs>
            <div className="h-4">
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={loading || !jsonData.trim()} type="submit">
                <RefreshCcw /> Convert
              </Button>
              <Button disabled={loading} type="button" onClick={clear} variant="destructive"><X /> Clear</Button>
            </div>
          </form>
        </div>

        {xmlData && (
          <div className="mt-12">
            <div className="flex items-center justify-between gap-8 mb-4">
              <h3 className="font-semibold">XML Data</h3>
              <div className="flex gap-2">
                <IconButton label="Copy" className="border border-slate-400" variant="outline" onClick={() => copy(xmlData)}><Copy /></IconButton>
                <IconButton label="Download file" onClick={() => downloadFile(xmlData, "xml-data.xml", "application/xml")}><Download /></IconButton>
              </div>
            </div>
            <Textarea className="border border-slate-400 p-4 text-sm" readOnly rows={12} value={xmlData} />
          </div>
        )}
      </div>
    </LandingPageLayout>
  );
};

export default JsonToXml;
