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
  return (
    <>
      <ScrollToTop />
      {!isDeck && <Nav />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/our-story" element={<OurStory />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blackrock" element={<BlackRock />} />
        </Routes>
      </main>
      {!isDeck && <Footer />}
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
