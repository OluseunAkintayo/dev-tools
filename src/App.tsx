import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from "react-router-dom";
import { CommandMenuProvider } from "@/components/command/CommandMenu";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./Pages/NotFound";
import Privacy from "./Pages/Privacy/index.tsx";
import Home from "./Pages/Home/index.tsx";
import JsonToCsv from "./Pages/JsonToCsv/index.tsx";
import CsvToJson from "./Pages/CsvToJson/index.tsx";
import InterfaceGenerator from "./Pages/InterfaceGenerator/index.tsx";
import JsonToZod from "./Pages/JsonToZod/index.tsx";
import JsonDiff from "./Pages/JsonDiff/index.tsx";
import RegexTester from "./Pages/RegexTester/index.tsx";
import JsonFormatter from "./Pages/JsonFormatter/index.tsx";
import ComingSoon from "./Pages/Coming Soon/index.tsx";
import XmlToJson from "./Pages/XmlToJson/index.tsx";
import JsonToXml from "./Pages/XmlToJson/JsonToXml.tsx";
import Base64EncoderDecoder from "./Pages/Base64EncoderDecoder/index.tsx";
import JwtTool from "./Pages/Jwt/index.tsx";
import TimestampConverter from "./Pages/TimestampConverter/index.tsx";
import UrlTools from "./Pages/UrlTools/index.tsx";
import HashGenerator from "./Pages/HashGenerator/index.tsx";
import UuidGenerator from "./Pages/UuidGenerator/index.tsx";

/** Shared shell: ⌘K menu, tooltips and scroll restoration for every route. */
const Root = () => (
  <TooltipProvider delayDuration={500} skipDelayDuration={300}>
    <CommandMenuProvider>
      <Outlet />
      <ScrollRestoration />
    </CommandMenuProvider>
  </TooltipProvider>
);

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/json-to-csv", element: <JsonToCsv /> },
      { path: "/csv-to-json", element: <CsvToJson /> },
      { path: "/json-to-interface", element: <InterfaceGenerator /> },
      { path: "/json-to-zod", element: <JsonToZod /> },
      { path: "/json-diff", element: <JsonDiff /> },
      { path: "/regex-tester", element: <RegexTester /> },
      { path: "/json-formatter", element: <JsonFormatter /> },
      { path: "/xml-to-json", element: <XmlToJson /> },
      { path: "/json-to-xml", element: <JsonToXml /> },
      { path: "/base64-encoder-decoder", element: <Base64EncoderDecoder /> },
      { path: "/jwt", element: <JwtTool /> },
      { path: "/timestamp-converter", element: <TimestampConverter /> },
      { path: "/url-encoder-decoder", element: <UrlTools /> },
      { path: "/hash-generator", element: <HashGenerator /> },
      { path: "/uuid-generator", element: <UuidGenerator /> },
      // Loaded on demand so the yaml library (~30 kB gzipped) stays out of the main bundle.
      { path: "/yaml-to-json", lazy: () => import("./Pages/YamlJson/index.tsx").then((page) => ({ Component: page.default })) },
      { path: "/json-to-yaml", lazy: () => import("./Pages/YamlJson/JsonToYaml.tsx").then((page) => ({ Component: page.default })) },
      { path: "/shadcn-theme-generator", element: <ComingSoon /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
