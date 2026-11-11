import React from "react";
import LandingPageLayout from "@/components/LandingPageLayout";
import IconButton from "@/components/IconButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, RotateCcw, X } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { generateInterface } from "@/lib/generateInterface";

const InterfaceGenerator = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const copy = useCopy();
  const [input, setInput] = React.useState<string>("");
  const [result, setResult] = React.useState<string>("");
  const [interfaceName, setInterfaceName] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!input.trim()) {
      setError("Input cannot be empty");
      return;
    }
    try {
      setResult(generateInterface(JSON.parse(input), interfaceName));
    } catch (err) {
      setResult("");
      setError(err instanceof Error ? err.message : "Unable to convert data at this time.");
    }
  };

  const clear = () => {
    setInput("");
    setResult("");
    setError(null);
    setInterfaceName("");
  };

  return (
    <LandingPageLayout>
      <div className="container px-4 py-8">
        <h1 className="text-center text-xl">Generate TypeScript interface from JSON</h1>
        <div className="h-8" />
        <div className="flex flex-col sm:flex-row w-full gap-12 sm:gap-4">
          <form className="space-y-2 w-full" onSubmit={handleGenerate}>
            <div className="space-y-2">
              <div className="flex gap-1 items-center mt-[1.625rem]">
                <Label htmlFor="json-input" className="font-semibold text-slate-700">Enter JSON data</Label>
              </div>
              <Textarea
                id="json-input"
                rows={12}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="text-sm border-slate-400 rounded-md resize-none"
              />
              <div className="h-8">
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interface-name" className="block text-sm font-medium text-slate-500">Interface name</Label>
              <Input
                id="interface-name"
                value={interfaceName}
                required
                onChange={(e) => setInterfaceName(e.target.value)}
                className="text-sm border-slate-400"
              />
            </div>
            <div className="grid gap-2 grid-cols-2 pt-4 sm:flex">
              <Button className="sm:w-[140px]" type="submit" disabled={!input.trim() || !interfaceName.trim()}>
                <RotateCcw /> Generate
              </Button>
              <Button className="sm:w-[140px]" type="button" onClick={clear} variant="destructive"><X /> Clear</Button>
            </div>
          </form>

          <div className="space-y-2 w-full">
            <div className="flex gap-8 items-end justify-between">
              <Label htmlFor="ts-output" className="block text-sm font-medium text-slate-700">TS Interface</Label>
              <IconButton label="Copy text" className="border border-slate-400" variant="outline" disabled={!result} onClick={() => copy(result)}><Copy /></IconButton>
            </div>
            <Textarea
              id="ts-output"
              rows={12}
              value={result}
              readOnly
              className="text-sm border-slate-400 rounded-md resize-none font-mono"
            />
          </div>
        </div>
      </div>
    </LandingPageLayout>
  );
};

export default InterfaceGenerator;
