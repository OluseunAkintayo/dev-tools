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
import X2JS from "x2js";

const XmlToJson = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const copy = useCopy();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [xmlData, setXmlData] = React.useState<string>("");
  const [xmlFile, setXmlFile] = React.useState<File | null>(null);
  const [jsonData, setJsonData] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  const convert = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const xmlDocument = new DOMParser().parseFromString(xmlData, "application/xml");
      if (xmlDocument.getElementsByTagName("parsererror").length > 0) {
        setJsonData("");
        setError("Invalid XML format. Please check your input.");
        return;
      }
      setJsonData(JSON.stringify(new X2JS().dom2js(xmlDocument), null, 2));
    } catch {
      setJsonData("");
      setError("Conversion failed. Please check your XML input.");
    }
  };

  const clear = () => {
    setXmlData("");
    setJsonData("");
    setError(null);
    setXmlFile(null);
  };

  const upload = async (file: File) => {
    setJsonData("");
    setError(null);
    setXmlFile(null);
    if (!hasExtension(file, ".xml")) {
      setError("Invalid file type! Please upload a .xml file.");
      return;
    }
    setLoading(true);
    try {
      setXmlData(await readFileAsText(file));
      setXmlFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error reading file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LandingPageLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-xl text-center">XML to JSON Converter</h1>
        <div className="h-8" />
        <div className="sm:max-w-[600px] mx-auto">
          <form onSubmit={convert} className="space-y-4">
            <Tabs defaultValue="upload" className="sm:max-w-[600px] mx-auto">
              <TabsList className="w-full">
                <TabsTrigger className="w-full" value="upload">Upload XML File</TabsTrigger>
                <TabsTrigger className="w-full" value="paste">Paste XML</TabsTrigger>
              </TabsList>
              <TabsContent value="paste" className="pt-4">
                <Textarea
                  aria-label="XML data"
                  value={xmlData}
                  rows={12}
                  onChange={(e) => setXmlData(e.target.value)}
                  className="text-xs"
                  placeholder="Paste your XML data here..."
                />
              </TabsContent>
              <TabsContent value="upload" className="pt-4 space-y-2">
                <Label>Upload XML File</Label>
                <FileUploadButton
                  accept=".xml,text/xml,application/xml"
                  onFileSelect={upload}
                  disabled={loading}
                  className="w-full bg-slate-200 hover:bg-slate-200/80 text-slate-700"
                >
                  Upload file
                </FileUploadButton>
                {xmlFile && <span className="block text-xs text-slate-500">{xmlFile.name}</span>}
              </TabsContent>
            </Tabs>
            <div className="h-4">
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={loading || !xmlData.trim()} type="submit">
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

export default XmlToJson;
