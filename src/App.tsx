import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import NotFound from './Pages/NotFound';
import Home from './Pages/Home/index.tsx';
import JsonToCsv from './Pages/JsonToCsv/index.tsx';

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
      path: "*",
      element: <NotFound />
    }
  ]);

  return <RouterProvider router={router} />
}

export default App;
