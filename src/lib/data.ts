import { Braces, Code, FileCode2, FileJson, FileText, Settings, Lock } from "lucide-react";

export const apps = [
    {
      title: "CSV to JSON",
      description: "Convert CSV files to JSON format with support for custom delimiters and nested structures.",
      icon: FileText,
      link: "/csv-to-json"
    },
    {
      title: "JSON to CSV",
      description: "Transform JSON data into CSV format with automatic column detection and field mapping.",
      icon: FileJson,
      link: "/json-to-csv"
    },
    {
      title: "XML to JSON Converter",
      description: "Convert XML files and strings to JSON.",
      icon: FileCode2,
      link: "/xml-to-json"
    },
    {
      title: "JSON to XML Converter",
      description: "Convert JSON files and strings to XML.",
      icon: FileCode2,
      link: "/json-to-xml"
    },
    {
      title: "JSON Formatter",
      description: "Format and validate JSON with customizable indentation and key sorting.",
      icon: Code,
      link: "/json-formatter"
    },
    {
      title: "TS Interface Generator",
      description: "Generate TypeScript interfaces from JSON data with smart type inference.",
      icon: Braces,
      link: "/json-to-interface"
    },
    {
      title: "Base64 Encoder/Decoder",
      description: "Encode plain text to Base64 format or decode Base64 strings back to plain text.",
      icon: Lock,
      link: "/base64-encoder-decoder"
    },
    {
      title: "Shadcn Theme Generator",
      description: "Generate css files for shadcn ui component library.",
      icon: Settings,
      link: "/shadcn-theme-generator"
    }
  ];