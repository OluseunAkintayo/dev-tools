import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, RefreshCcw, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LandingPageLayout from "@/components/LandingPageLayout";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  encodeToBase64,
  decodeFromBase64,
  validateTextInput,
  validateBase64Input,
} from "@/lib/base64";

interface Base64State {
  inputText: string;
  outputText: string;
  mode: 'encode' | 'decode';
  loading: boolean;
  error: string | null;
}

const Base64EncoderDecoder = () => {
  const toast = useToast().toast;

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [state, setState] = React.useState<Base64State>({
    inputText: "",
    outputText: "",
    mode: 'encode',
    loading: false,
    error: null,
  });

  const handleModeChange = (newMode: 'encode' | 'decode') => {
    setState(prev => ({
      ...prev,
      mode: newMode,
      outputText: "", // Clear previous results
      error: null, // Clear previous errors
      // Keep inputText as per requirement 3.4
    }));
  };

  const handleInputChange = (value: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        inputText: value,
      };
      
      // Clear errors when valid input is provided (Requirement 5.4)
      if (prev.error && value.trim().length > 0) {
        // Validate the new input to see if error should be cleared
        const validation = prev.mode === 'encode' 
          ? validateTextInput(value)
          : validateBase64Input(value);
        
        if (validation.isValid) {
          newState.error = null;
        }
      }
      
      return newState;
    });
  };

  const handleConvert = async () => {
    // Prevent operation if already loading (Requirement 5.3)
    if (state.loading) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (state.mode === 'encode') {
        const validation = validateTextInput(state.inputText);
        if (!validation.isValid) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: validation.error || "Invalid input",
          }));
          return;
        }

        const encoded = encodeToBase64(state.inputText);
        // Add a small delay to show loading state (consistent with other tools)
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            outputText: encoded,
            loading: false,
          }));
        }, 500);
      } else {
        const validation = validateBase64Input(state.inputText);
        if (!validation.isValid) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: validation.error || "Invalid Base64 format",
          }));
          return;
        }

        const decoded = decodeFromBase64(state.inputText.trim());
        // Add a small delay to show loading state (consistent with other tools)
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            outputText: decoded,
            loading: false,
          }));
        }, 500);
      }
    } catch (error) {
      // Graceful error handling without crashing (Requirement 5.5)
      let errorMessage = "Conversion failed";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Ensure we always reset loading state even on error
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        outputText: "", // Clear any previous output on error
      }));
      
      // Log error for debugging but don't crash the application
      console.error('Base64 conversion error:', error);
    }
  };

  const handleClear = () => {
    setState(prev => ({
      ...prev,
      inputText: "",
      outputText: "",
      error: null,
    }));
  };

  const handleCopy = async () => {
    if (!state.outputText) return;
    
    try {
      await navigator.clipboard.writeText(state.outputText);
      toast({
        title: "Copied to clipboard!",
        className: 'top-0 right-0 flex fixed md:max-w-[320px] md:top-4 md:right-4'
      });
    } catch (error) {
      // Graceful error handling for clipboard operations (Requirement 5.5)
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Failed to copy to clipboard",
        description: "Please try selecting and copying the text manually",
        variant: "destructive",
        className: 'top-0 right-0 flex fixed md:max-w-[320px] md:top-4 md:right-4'
      });
    }
  };

  const handleDownload = () => {
    if (!state.outputText || state.outputText.trim() === "") return;
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const filename = state.mode === 'encode' ? 'encoded-base64.txt' : 'decoded-text.txt';
      const mimeType = 'text/plain';
      
      const blob = new Blob([state.outputText], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up resources
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      // Graceful error handling for download operations (Requirement 5.5)
      console.error('Failed to download file:', error);
      setState(prev => ({ ...prev, loading: false }));
      
      toast({
        title: "Download failed",
        description: "Please try copying the text and saving it manually",
        variant: "destructive",
        className: 'top-0 right-0 flex fixed md:max-w-[320px] md:top-4 md:right-4'
      });
    }
  };

  const getInputPlaceholder = () => {
    return state.mode === 'encode' 
      ? "Enter text to encode to Base64..."
      : "Enter Base64 string to decode...";
  };

  const getInputLabel = () => {
    return state.mode === 'encode' 
      ? "Text to Encode"
      : "Base64 to Decode";
  };

  const getOutputLabel = () => {
    return state.mode === 'encode' 
      ? "Base64 Encoded Result"
      : "Decoded Text Result";
  };

  const getConvertButtonText = () => {
    if (state.loading) {
      return state.mode === 'encode' ? 'Encoding...' : 'Decoding...';
    }
    return state.mode === 'encode' ? 'Encode' : 'Decode';
  };

  return (
    <LandingPageLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-xl text-center">Base64 Encoder/Decoder</h1>
        <div className="h-8" />
        
        <div className="sm:max-w-[600px] mx-auto">
          <Tabs value={state.mode} onValueChange={(value) => handleModeChange(value as 'encode' | 'decode')}>
            <TabsList className="w-full">
              <TabsTrigger className="w-full" value="encode">Encode to Base64</TabsTrigger>
              <TabsTrigger className="w-full" value="decode">Decode from Base64</TabsTrigger>
            </TabsList>
            
            <TabsContent value={state.mode} className="pt-4">
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleConvert(); }}>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">{getInputLabel()}</Label>
                  <Textarea
                    className="border border-slate-400 resize-none text-sm"
                    placeholder={getInputPlaceholder()}
                    rows={12}
                    disabled={state.loading}
                    value={state.inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                  />
                  <div className="h-6">
                    {state.error && <p className="text-destructive text-sm">{state.error}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    disabled={state.loading || !state.inputText || state.inputText.trim() === ""} 
                    type="submit"
                    className="sm:w-full"
                  >
                    {state.loading ? (
                      <><RefreshCcw className="animate-spin" /> {getConvertButtonText()}</>
                    ) : (
                      <><RefreshCcw /> {getConvertButtonText()}</>
                    )}
                  </Button>
                  <Button 
                    disabled={state.loading} 
                    onClick={handleClear} 
                    className="sm:w-full" 
                    type="button" 
                    variant='destructive'
                  >
                    <X /> Clear
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {state.outputText && (
          <div className="mt-12 sm:max-w-[600px] mx-auto">
            <div className="flex items-center justify-between gap-8 mb-4">
              <h3 className="font-semibold">{getOutputLabel()}</h3>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button 
                        className="border border-slate-400" 
                        variant="outline" 
                        disabled={state.loading || !state.outputText} 
                        onClick={handleCopy} 
                        size="icon" 
                        type="button"
                      >
                        <Copy />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Copy to clipboard</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button 
                        disabled={state.loading || !state.outputText} 
                        onClick={handleDownload} 
                        size="icon" 
                        type="button"
                      >
                        <Download />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Download file</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <Textarea
              className="border border-slate-400 resize-none text-sm"
              rows={12}
              readOnly
              value={state.outputText}
              disabled={state.loading}
            />
          </div>
        )}
      </div>
    </LandingPageLayout>
  );
};

export default Base64EncoderDecoder;