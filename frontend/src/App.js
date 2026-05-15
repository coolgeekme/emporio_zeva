import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Collection from "./pages/Collection";
import ProductDetail from "./pages/ProductDetail";
import OurStory from "./pages/OurStory";
import Journal from "./pages/Journal";
import Contact from "./pages/Contact";
import BlackRock from "./pages/BlackRock";
import Ritual from "./pages/Ritual";
import OneSheet from "./pages/OneSheet";
import Admin from "./pages/Admin";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function Shell() {
  const { pathname } = useLocation();
  const isDeck = pathname === "/blackrock";
  const isAdmin = pathname.startsWith("/admin");
  const isChrome = !isDeck && !isAdmin;
  return (
    <>
      <ScrollToTop />
      {isChrome && <Nav />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/our-story" element={<OurStory />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blackrock" element={<BlackRock />} />
          <Route path="/ritual" element={<Ritual />} />
          <Route path="/one-sheet" element={<OneSheet />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      {isChrome && <Footer />}
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </div>
  );
}

export default App;
