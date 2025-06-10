import { createRoot } from "react-dom/client";
import TestApp from "./TestApp";
// import App from "./App";
import "./index.css";

// Add debugging to see what's happening
console.log("Main.tsx executing...");
console.log("Looking for root element...");

const rootElement = document.getElementById("root");
console.log("Root element found:", !!rootElement);

if (!rootElement) {
  console.error("Root element not found!");
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h1>Setup Error</h1>
      <p>Could not find root element. The page structure may be incorrect.</p>
    </div>
  `;
} else {
  try {
    console.log("Creating React root...");
    const root = createRoot(rootElement);
    
    console.log("Rendering TestApp component...");
    root.render(<TestApp />);
    
    console.log("React application started successfully");
  } catch (error) {
    console.error("Failed to start React application:", error);
    
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1>Application Error</h1>
        <p>The application failed to start. Please check the console for details.</p>
        <details style="margin-top: 10px;">
          <summary>Error Details</summary>
          <pre style="text-align: left; background: #f5f5f5; padding: 10px; margin-top: 10px;">${error}</pre>
        </details>
      </div>
    `;
  }
}
