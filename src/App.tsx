import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Browse from "./pages/Browse";
import MyShelf from "./pages/MyShelf";
import UserShelf from "./pages/UserShelf";
import AddBook from "./pages/AddBook";
import SwapHistory from "./pages/SwapHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/user/:id" element={<UserShelf />} />
          <Route path="/my" element={<MyShelf />} />
          <Route path="/my/add" element={<AddBook />} />
          <Route path="/my/edit/:id" element={<AddBook />} />
          <Route path="/swaps" element={<SwapHistory />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
