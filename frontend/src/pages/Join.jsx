import { useState } from "react";
import axios from "axios";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// QR landing page — the insert card's QR code points here. Collects name +
// email (native, stored in the newsletter collection with source "insert_card")
// so Eva can reach these people for limited drops and flash sales.
export default function Join() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | ok | err
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      await axios.post(`${API}/newsletter`, { email, name, source: "insert_card" });
      setStatus("ok");
      setMsg("You're in. Watch your inbox — limited drops and flash sales land there first.");
    } catch (err) {
      setStatus("err");
      setMsg("Something went wrong. Try again in a moment.");
    }
  };

  return (
    <div className="pt-[90px]" data-testid="join-page">
      <section className="max-w-[680px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-28 text-center">
        <p className="overline text-[#C05A3A]">Not-A-Salami · Inner circle</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] tracking-tight mt-6 text-[#2A1F1D]">
          First to know.
          <br />
          <span className="italic text-[#C05A3A]">First to the table.</span>
        </h1>
        <p className="mt-7 text-lg text-[#5C4E4A] leading-relaxed max-w-md mx-auto">
          Join the list and we'll write when a limited drop, a new flavor, or a
          flash sale comes out of the kitchen — before it goes anywhere else.
        </p>

        {status === "ok" ? (
          <div className="mt-12 bg-[#FBF7EE] border border-[#DFD7CA] px-8 py-10">
            <p className="font-serif text-2xl text-[#2A1F1D]" data-testid="join-success">
              {msg}
            </p>
            <Link to="/" className="link-underline mt-8 inline-flex items-center gap-2">
              Back to Not-A-Salami <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mt-12 max-w-sm mx-auto space-y-4"
            data-testid="join-form"
          >
            <div className="field text-left">
              <label htmlFor="join-name">First name</label>
              <input
                id="join-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Eva"
                autoComplete="given-name"
                data-testid="join-name-input"
              />
            </div>
            <div className="field text-left">
              <label htmlFor="join-email">Email</label>
              <input
                id="join-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@table.com"
                autoComplete="email"
                data-testid="join-email-input"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-primary w-full justify-center inline-flex items-center gap-2"
              data-testid="join-submit"
            >
              {status === "loading" ? "Sending…" : "Join the list"} <ArrowRight size={14} />
            </button>
            {status === "err" && (
              <p className="text-sm text-[#C05A3A]" data-testid="join-error">
                {msg}
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
