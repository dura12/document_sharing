import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "@/context/AuthContext";
import { DocumentDashboard } from "@/components/DocumentDashboard";
import { TextEditor } from "@/components/TextEditor";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DocumentDashboard />} />
          <Route path="/documents/:id" element={<TextEditor />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
