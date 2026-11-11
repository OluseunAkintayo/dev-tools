import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, RefreshCcw, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LandingPageLayout from "@/components/LandingPageLayout";
import IconButton from "@/components/IconButton";
import { useCopy } from "@/hooks/use-copy";
import { downloadFile } from "@/lib/download";
import {
  encodeToBase64,
  decodeFromBase64,
  validateTextInput,
  validateBase64Input,
} from "@/lib/base64";

type Mode = "encode" | "decode";

const Base64EncoderDecoder = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const copy = useCopy();
  const [mode, setMode] = React.useState<Mode>("encode");
  const [inputText, setInputText] = React.useState<string>("");
  const [outputText, setOutputText] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  const validate = (value: string, currentMode: Mode) =>
    currentMode === "encode" ? validateTextInput(value) : validateBase64Input(value);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setOutputText("");
    setError(null);
  };

  const handleInputChange = (value: string) => {
    setInputText(value);
    if (error && validate(value, mode).isValid) setError(null);
  };

  const handleConvert = () => {
    const validation = validate(inputText, mode);
    if (!validation.isValid) {
      setOutputText("");
      setError(validation.error || "Invalid input");
      return;
    }
    try {
      setOutputText(mode === "encode" ? encodeToBase64(inputText) : decodeFromBase64(inputText));
      setError(null);
    } catch (err) {
      setOutputText("");
      setError(err instanceof Error ? err.message : "Conversion failed");
    }
  };

  const handleClear = () => {
    setInputText("");
    setOutputText("");
    setError(null);
  };

  const isEncode = mode === "encode";

  return (
    <LandingPageLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-xl text-center">Base64 Encoder/Decoder</h1>
        <div className="h-8" />

        <div className="sm:max-w-[600px] mx-auto">
          <Tabs value={mode} onValueChange={(value) => handleModeChange(value as Mode)}>
            <TabsList className="w-full">
              <TabsTrigger className="w-full" value="encode">Encode to Base64</TabsTrigger>
              <TabsTrigger className="w-full" value="decode">Decode from Base64</TabsTrigger>
            </TabsList>

            <TabsContent value={mode} className="pt-4">
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleConvert(); }}>
                <div className="space-y-2">
                  <Label htmlFor="base64-input" className="font-semibold text-slate-700">
                    {isEncode ? "Text to Encode" : "Base64 to Decode"}
                  </Label>
                  <Textarea
                    id="base64-input"
                    className="border border-slate-400 resize-none text-sm"
                    placeholder={isEncode ? "Enter text to encode to Base64..." : "Enter Base64 string to decode..."}
                    rows={12}
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                  />
                  <div className="h-6">
                    {error && <p className="text-destructive text-sm">{error}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button disabled={!inputText.trim()} type="submit" className="sm:w-full">
                    <RefreshCcw /> {isEncode ? "Encode" : "Decode"}
                  </Button>
                  <Button onClick={handleClear} className="sm:w-full" type="button" variant="destructive">
                    <X /> Clear
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {outputText && (
          <div className="mt-12 sm:max-w-[600px] mx-auto">
            <div className="flex items-center justify-between gap-8 mb-4">
              <h3 className="font-semibold">{isEncode ? "Base64 Encoded Result" : "Decoded Text Result"}</h3>
              <div className="flex gap-2">
                <IconButton label="Copy to clipboard" className="border border-slate-400" variant="outline" onClick={() => copy(outputText)}>
                  <Copy />
                </IconButton>
                <IconButton
                  label="Download file"
                  onClick={() => downloadFile(outputText, isEncode ? "encoded-base64.txt" : "decoded-text.txt", "text/plain")}
                >
                  <Download />
                </IconButton>
              </div>
            </div>
            <Textarea className="border border-slate-400 resize-none text-sm" rows={12} readOnly value={outputText} />
          </div>
        )}
      </div>
    </LandingPageLayout>
  );
};

export default Base64EncoderDecoder;
