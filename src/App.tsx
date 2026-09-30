import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Browse from "./pages/Browse";
import MyShelf from "./pages/MyShelf";
import UserShelf from "./pages/UserShelf";
import AddBook from "./pages/AddBook";
import SwapInbox from "./pages/SwapInbox";
import SwapDetail from "./pages/SwapDetail";
import WriteReview from "./pages/WriteReview";
import Reviews from "./pages/Reviews";
import UserReviews from "./pages/UserReviews";
import SwapWall from "./pages/SwapWall";
import BookDetail from "./pages/BookDetail";
import Terms from "./pages/Terms";
import Rules from "./pages/Rules";
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
          <Route path="/my/review/:bookId" element={<WriteReview />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/reviews/user/:userId" element={<UserReviews />} />
          <Route path="/book/:title" element={<BookDetail />} />
          <Route path="/wall" element={<SwapWall />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/swaps" element={<Navigate to="/swaps/inbox" replace />} />
          <Route path="/swaps/inbox" element={<SwapInbox />} />
          <Route path="/swaps/:id" element={<SwapDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
