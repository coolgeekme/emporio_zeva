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
import DeckView from "./pages/DeckView";
import JournalArticle from "./pages/JournalArticle";
import PagePublic from "./pages/PagePublic";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Defer to next frame so the target element is mounted
      requestAnimationFrame(() => {
        const el = document.getElementById(hash.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        window.scrollTo({ top: 0, behavior: "instant" });
      });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, hash]);
  return null;
}

function Shell() {
  const { pathname } = useLocation();
  const isDeck = pathname === "/blackrock" || pathname === "/corporate" || pathname.startsWith("/deck/");
  const isAdmin = pathname.startsWith("/admin");
  const isCmsPage = pathname.startsWith("/p/");
  // CMS pages render their own Nav+Footer inside the component, so suppress chrome here too.
  const isChrome = !isDeck && !isAdmin && !isCmsPage;
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
          <Route path="/journal/:slug" element={<JournalArticle />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blackrock" element={<BlackRock />} />
          <Route path="/corporate" element={<BlackRock />} />
          <Route path="/deck/:slug" element={<DeckView />} />
          <Route path="/ritual" element={<Ritual />} />
          <Route path="/one-sheet" element={<OneSheet />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/p/:slug" element={<PagePublic />} />
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
