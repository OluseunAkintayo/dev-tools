import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import NotFound from './Pages/NotFound';
import Home from './Pages/Home/index.tsx';
import JsonToCsv from './Pages/JsonToCsv/index.tsx';
import CsvToJson from './Pages/CsvToJson/index.tsx';
import InterfaceGenerator from './Pages/InterfaceGenerator/index.tsx';

function App() {

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
      path: "*",
      element: <NotFound />
    }
  ]);

  return <RouterProvider router={router} />
}

export default App;
