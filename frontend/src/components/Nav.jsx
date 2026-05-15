import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { LOGO_URL } from "../content";

const links = [
  { to: "/", label: "Home" },
  { to: "/collection", label: "Collection" },
  { to: "/ritual", label: "Ritual" },
  { to: "/our-story", label: "Our Story" },
  { to: "/journal", label: "Journal" },
  { to: "/contact", label: "Contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header
      className="glass-nav fixed top-0 left-0 right-0 z-50"
      data-testid="site-nav"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 flex items-center justify-between h-[90px]">
        <Link
          to="/"
          data-testid="nav-logo"
          className="flex items-center"
        >
          <img
            src={LOGO_URL}
            alt="Emporio Zeva"
            className="h-[60px] md:h-[72px] w-auto select-none"
            draggable="false"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              data-testid={`nav-link-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                `text-[11px] tracking-[0.22em] uppercase font-semibold transition-colors ${
                  isActive ? "text-[#C05A3A]" : "text-[#2A1F1D] hover:text-[#C05A3A]"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <Link
          to="/contact"
          data-testid="nav-inquire-cta"
          className="hidden md:inline-flex btn-primary !py-2.5 !px-4 !text-[10px]"
        >
          Inquire
        </Link>

        <button
          className="md:hidden text-[#2A1F1D]"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          data-testid="nav-mobile-toggle"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div
          className="md:hidden border-t border-[#DFD7CA] bg-[#F9F6F0]"
          data-testid="nav-mobile-panel"
        >
          <div className="px-6 py-8 flex flex-col gap-6">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                data-testid={`nav-mobile-link-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  `text-sm tracking-[0.22em] uppercase font-semibold ${
                    isActive ? "text-[#C05A3A]" : "text-[#2A1F1D]"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/contact"
              data-testid="nav-mobile-inquire-cta"
              className="btn-primary self-start"
            >
              Inquire
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
