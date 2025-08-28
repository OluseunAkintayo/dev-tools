/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, RefreshCcw, Upload, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LandingPageLayout from "@/components/LandingPageLayout";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast";
import X2JS from "x2js";
import { formatXml } from "@/lib/formatXml";


const JsonToXml = () => {
  const toast = useToast().toast;
  const [loading, setLoading] = React.useState<boolean>(false);
  const [jsonData, setJsonData] = React.useState<string>("");
  const [jsonFile, setJsonFile] = React.useState<File | null>(null);
  const [xmlData, setXmlData] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  // Convert JSON to XML using x2js
  const convert = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const x2js = new X2JS();
      let jsonObj: any = {};
      try {
        jsonObj = JSON.parse(jsonData);
        const xml = x2js.js2xml(jsonObj);
        setTimeout(() => {
          setXmlData(formatXml(xml));
        }, 1200);
      } catch {
        setError("Invalid JSON format. Please check your input.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Conversion failed. Please check your JSON input.");
    }
    finally {
      setLoading(false);
    }
  };

  const clear = () => {
    if (jsonData) setJsonData("");
    if (xmlData) setXmlData("");
    if (error) setError(null);
    if (jsonFile) setJsonFile(null);
  };

  const download = () => {
    if (!xmlData) return;
    setLoading(true);
    const blob = new Blob([xmlData], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "xml-data.xml");
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
    setLoading(false);
  };

  const copy = async () => {
    if (!xmlData) return;
    await navigator.clipboard.writeText(xmlData);
    toast({
      title: "Copied to clipboard!",
      className: 'top-0 right-0 flex fixed md:max-w-[320px] md:top-4 md:right-4'
    });
  };

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (xmlData) setXmlData("");
    if (error) setError(null);
    if (jsonFile) setJsonFile(null);
    if (jsonData) setJsonData("");

    const file = e.target.files ? e.target.files[0] : null;
    if (!file) {
      setError("No file selected");
      return;
    }

    if (file.type !== "application/json" || !file.name.endsWith(".json")) {
      setError("Invalid file type! Please upload a .json file.");
      return;
    }

    setJsonFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const fileContent: string | ArrayBuffer | null = reader.result;
      setJsonData(fileContent as string);
    };
    reader.readAsText(file);
    reader.onloadend = () => { };
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
              <TabsContent value="paste">
                <div className="pt-4">
                  <div className="space-y-2">
                    <Textarea
                      id="jsonData"
                      value={jsonData} rows={12}
                      onChange={(e) => setJsonData(e.target.value)}
                      className="text-xs"
                      placeholder="Paste your JSON data here..."
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="upload" className="pt-4">
                <div className="space-y-2">
                  <Label>Upload JSON File</Label>
                  <Input type="file" id="json-file" accept=".json" className="hidden" onChange={upload} />
                  <Button type="button" className="p-0 m-0 block w-full bg-slate-200 hover:bg-slate-200/80 border-none outline-none">
                    <Label htmlFor="json-file" className="flex items-center justify-center cursor-pointer h-10 px-4 rounded-md text-slate-700">
                      <Upload className="mr-2 h-4 w-4" /> Upload file
                    </Label>
                  </Button>
                  <div className="h-4">
                    {jsonFile && <span className="text-xs text-slate-500">{jsonFile.name}</span>}
                    {error && <span className="text-xs text-destructive">{error}</span>}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 gap-2">
              <Button disabled={loading || !jsonData} type="submit">
                {loading ? <><RefreshCcw className="animate-spin" /> Converting</> : <><RefreshCcw /> Convert</>}
              </Button>
              <Button disabled={loading} type="button" onClick={clear} variant="destructive"><X /> Clear</Button>
            </div>
          </form>
        </div>

        {xmlData && (
          <div className="mt-12">
            <div className="flex items-center justify-between gp-8 mb-4">
              <h3 className="font-semibold">XML Data</h3>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button className="border border-slate-400" variant="outline" disabled={loading || !xmlData} onClick={copy} size="icon" type="button"><Copy /></Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Copy</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button disabled={loading || !xmlData} onClick={download} size="icon" type="button"><Download /></Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Download file</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Textarea
              className="border border-slate-400 p-4 text-sm"
              readOnly rows={12}
              value={xmlData}
              disabled={loading}
            />
          </div>
        )}
      </div>
    </LandingPageLayout>
  );
};

export default JsonToXml;
