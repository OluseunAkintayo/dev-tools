import { createBrowserRouter, RouterProvider, useLocation } from 'react-router-dom';
import NotFound from './Pages/NotFound';
import Home from './Pages/Home/index.tsx';
import JsonToCsv from './Pages/JsonToCsv/index.tsx';
import CsvToJson from './Pages/CsvToJson/index.tsx';
import InterfaceGenerator from './Pages/InterfaceGenerator/index.tsx';
import JsonFormatter from './Pages/JsonFormatter/index.tsx';
import ComingSoon from './Pages/Coming Soon/index.tsx';
import XmlToJson from './Pages/XmlToJson/index.tsx';
import React from 'react';

function App() {

  const location = useLocation();

  React.useEffect(() => {
    console.log({ location: location.pathname });
  }, [location.pathname]);

  const router = createBrowserRouter([
    {
      path: "/",
      element: <Home />
    },
    {
      path: "/json-to-csv",
      element: <JsonToCsv />
    },
    {
      path: "/csv-to-json",
      element: <CsvToJson />
    },
    {
      path: "/json-to-interface",
      element: <InterfaceGenerator />
    },
    {
      path: "/json-formatter",
      element: <JsonFormatter />
    },
    {
      path: "/xml-to-json",
      element: <XmlToJson />
    },
    {
      path: "/shadcn-theme-generator",
      element: <ComingSoon />
    },
    {
      path: "*",
      element: <NotFound />
    }
  ]);

  return <RouterProvider router={router} />
}

export default App;
