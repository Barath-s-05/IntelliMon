import React, { useState } from "react";
import Dashboard from "./Dashboard";
import Auth from "./Auth";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />;
  }

  return <Dashboard />;
}

export default App;