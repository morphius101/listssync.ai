import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  console.log("Starting React application...");
  createRoot(rootElement).render(<App />);
  console.log("React application mounted successfully");
} catch (error) {
  console.error("Failed to start application:", error);
  
  // Create a fallback error display
  const rootElement = document.getElementById("root") || document.body;
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h1>Application Error</h1>
      <p>Failed to load the application. Please refresh the page.</p>
      <details>
        <summary>Error Details</summary>
        <pre>${error}</pre>
      </details>
    </div>
  `;
}
