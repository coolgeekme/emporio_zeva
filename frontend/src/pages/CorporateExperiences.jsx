import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowRight } from "lucide-react";
import { CONTACT } from "../content";
import { useSiteContent } from "../hooks/useSiteContent";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ---------------------------------------------------------------------------
// Corporate Experiences — rebuilt Sep 2026 to Eva's replacement copy.
// One action only: "Request a tasting". Every string lives in site content so
// Eva can maintain the page from her dashboard (Admin → Site Content →
// Corporate Experiences).
// ---------------------------------------------------------------------------

const CONSIDERING_OPTIONS = ["Team", "Clients", "Event", "Not sure yet"];

// Renders a copy string, turning a trailing "See our Privacy Policy." into a link.
function WithPrivacyLink({ text, className = "" }) {
  if (!text) return null;
  const marker = "Privacy Policy";
  const idx = text.indexOf(marker);
  if (idx === -1) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {text.slice(0, idx)}
      <Link to="/privacy" className="link-underline">
        {marker}
      </Link>
      {text.slice(idx + marker.length)}
    </span>
  );
}

function CorporateInquiryForm({ c, formRef }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role_department: "",
    considering: "",
    num_recipients: "",
    preferred_date: "",
    location: "",
    special_requirements: "",
  });
  const [status, setStatus] = useState("idle"); // idle | loading | ok | err

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await axios.post(`${API}/inquiries`, {
        name: form.name,
        email: form.email,
        subject: "Request a tasting",
        message: form.special_requirements || "Corporate tasting request",
        kind: "corporate_tasting",
        company: form.company,
        role_department: form.role_department,
        considering: form.considering,
        num_recipients: form.num_recipients,
        preferred_date: form.preferred_date,
        location: form.location,
        special_requirements: form.special_requirements,
      });
      setStatus("ok");
    } catch (err) {
      setStatus("err");
    }
  };

  if (status === "ok") {
    return (
      <div
        className="bg-[#FBF7EE] border border-[#DFD7CA] p-8 md:p-12 text-center"
        data-testid="corporate-form-success"
      >
        <p className="overline text-[#C05A3A]">Grazie</p>
        <h3 className="font-serif text-3xl md:text-4xl text-[#2A1F1D] mt-3">
          {c("form_success", "Thank you. We received your request and will be in touch to discuss the tasting and next steps.")}
        </h3>
        <button onClick={() => setStatus("idle")} className="btn-outline mt-8 text-sm">
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-7" data-testid="corporate-inquiry-form">
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="field">
          <label htmlFor="co-name">Name</label>
          <input id="co-name" type="text" required value={form.name} onChange={set("name")} placeholder="Your name" data-testid="corporate-name-input" />
        </div>
        <div className="field">
          <label htmlFor="co-email">Work email</label>
          <input id="co-email" type="email" required value={form.email} onChange={set("email")} placeholder="you@company.com" data-testid="corporate-email-input" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="field">
          <label htmlFor="co-company">Company</label>
          <input id="co-company" type="text" required value={form.company} onChange={set("company")} placeholder="Company, Inc." data-testid="corporate-company-input" />
        </div>
        <div className="field">
          <label htmlFor="co-role">Role or department (optional)</label>
          <input id="co-role" type="text" value={form.role_department} onChange={set("role_department")} placeholder="People Ops, Marketing, Events…" data-testid="corporate-role-input" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="field">
          <label htmlFor="co-considering">What are you considering?</label>
          <select id="co-considering" value={form.considering} onChange={set("considering")} data-testid="corporate-considering-input">
            <option value="">Select one</option>
            {CONSIDERING_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="co-recipients">Approximate number of recipients (optional)</label>
          <input id="co-recipients" type="text" value={form.num_recipients} onChange={set("num_recipients")} placeholder="e.g. 25" data-testid="corporate-recipients-input" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="field">
          <label htmlFor="co-date">Preferred date or timeframe</label>
          <input id="co-date" type="text" value={form.preferred_date} onChange={set("preferred_date")} placeholder="e.g. early December, or a few weeks out" data-testid="corporate-date-input" />
        </div>
        <div className="field">
          <label htmlFor="co-location">Location</label>
          <input id="co-location" type="text" value={form.location} onChange={set("location")} placeholder="Your office, venue, or our studio" data-testid="corporate-location-input" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="co-notes">What would you like us to know? (optional)</label>
        <textarea
          id="co-notes"
          rows={4}
          value={form.special_requirements}
          onChange={set("special_requirements")}
          placeholder="The occasion, who it is for, anything we should prepare for…"
          data-testid="corporate-notes-input"
        />
      </div>

      <div className="text-sm text-[#5C4E4A] leading-relaxed" data-testid="corporate-consent">
        <WithPrivacyLink text={c("form_consent", "By submitting this form, you agree that Not A Salami may contact you about this inquiry. See our Privacy Policy.")} />
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-2">
        <button type="submit" disabled={status === "loading"} className="btn-primary" data-testid="corporate-submit-button">
          {status === "loading" ? "Sending…" : `${c("form_submit", "Request my tasting")} →`}
        </button>
        {status === "err" && (
          <p className="text-sm text-[#C05A3A]">
            {c("form_error", "Something didn't go through. Try again, or email us directly.")}{" "}
            <a className="link-underline" href={`mailto:${CONTACT.email_primary}`}>{CONTACT.email_primary}</a>
          </p>
        )}
      </div>
    </form>
  );
}

export default function CorporateExperiences() {
  const c = useSiteContent("corporate");
  const formRef = useRef(null);

  const goToForm = () => {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const ritual = [1, 2, 3, 4, 5].map((i) => ({
    title: c(`ritual_${i}_title`, ""),
    body: c(`ritual_${i}_body`, ""),
  }));

  const tasting = [1, 2, 3].map((i) => ({
    title: c(`tasting_${i}_title`, ""),
    body: c(`tasting_${i}_body`, ""),
  }));

  const fit = [1, 2, 3].map((i) => ({
    title: c(`fit_${i}_title`, ""),
    body: c(`fit_${i}_body`, ""),
  }));

  const discuss = [1, 2, 3, 4, 5].map((i) => c(`discuss_${i}`, "")).filter(Boolean);

  return (
    <div className="pt-[90px]" data-testid="corporate-experiences-page">
      {/* ---------------- Hero ---------------- */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-16 md:pb-20 border-b border-[#DFD7CA]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <p className="overline text-[#C05A3A]">{c("hero_eyebrow", "Corporate tasting")}</p>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mt-5 text-[#2A1F1D] max-w-3xl">
              {c("hero_h1", "A year-round dessert made to bring, slice and share.")}
            </h1>
            <p className="mt-7 text-[#5C4E4A] leading-relaxed max-w-2xl text-lg">
              {c("hero_body1", "")}
            </p>
            <p className="mt-4 text-[#5C4E4A] leading-relaxed max-w-2xl">
              {c("hero_body2", "")}
            </p>
            <div className="mt-10" data-testid="corporate-hero-ctas">
              <button onClick={goToForm} className="btn-primary inline-flex items-center gap-2" data-testid="corporate-cta-tasting">
                {c("hero_button", "Request a tasting")} <ArrowRight size={14} />
              </button>
              <p className="mt-4 text-sm text-[#5C4E4A] max-w-md italic">
                {c("hero_supporting", "")}
              </p>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="img-wash aspect-[4/5] max-h-[70vh]">
              <img src={c("hero_image", "/api/static/corporate/hero-woodboard.jpg")} alt="Not A Salami on a serving board with the first slices cut" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Introduction ---------------- */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.08] text-[#2A1F1D]">
              {c("intro_title", "The experience begins before the first bite")}
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-5 text-[#5C4E4A] leading-relaxed text-lg">
            <p>{c("intro_body1", "")}</p>
            <p>{c("intro_body2", "")}</p>
          </div>
        </div>
      </section>

      {/* ---------------- The ritual ---------------- */}
      <section className="bg-[#EAE4D9]/50 py-20 md:py-28 border-y border-[#DFD7CA]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <p className="overline text-[#C05A3A]">{c("ritual_overline", "The Not-A-Salami ritual")}</p>
          <h2 className="font-serif text-3xl md:text-5xl leading-[1.08] mt-4 max-w-3xl text-[#2A1F1D]">
            {c("ritual_title", "Five simple moments, shared around the table")}
          </h2>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {ritual.map((step, i) => (
              <div key={step.title || i} data-testid={`corporate-ritual-${i}`} className="border-t border-[#DFD7CA] pt-6">
                <p className="overline text-[#B9935A]">No 0{i + 1}</p>
                <h3 className="font-serif text-2xl text-[#2A1F1D] mt-3">{step.title}</h3>
                <p className="text-sm text-[#5C4E4A] leading-relaxed mt-3">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- The 20-minute tasting ---------------- */}
      <section className="bg-[#2A1F1D] text-[#F9F6F0] py-20 md:py-28">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <p className="overline text-[#B9935A]">{c("tasting_overline", "The 20-minute tasting")}</p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-10">
            {tasting.map((b, i) => (
              <div key={b.title || i} data-testid={`corporate-tasting-${i}`}>
                <h3 className="font-serif text-2xl md:text-3xl text-[#F9F6F0]">{b.title}</h3>
                <p className="text-sm text-[#DFD7CA] leading-relaxed mt-4">{b.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-14 font-serif text-xl md:text-2xl text-[#F9F6F0] italic max-w-2xl">
            {c("tasting_closing", "")}
          </p>
        </div>
      </section>

      {/* ---------------- Where it can fit ---------------- */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
        <p className="overline text-[#C05A3A]">{c("fit_overline", "Where it can fit")}</p>
        <h2 className="font-serif text-3xl md:text-5xl leading-[1.08] mt-4 max-w-3xl text-[#2A1F1D]">
          {c("fit_title", "One dessert, many occasions throughout the year")}
        </h2>
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {fit.map((f, i) => (
                <div key={f.title || i} data-testid={`corporate-fit-${i}`} className="border border-[#DFD7CA] bg-[#F9F6F0] p-6">
                  <h3 className="font-serif text-2xl text-[#2A1F1D]">{f.title}</h3>
                  <p className="text-sm text-[#5C4E4A] leading-relaxed mt-3">{f.body}</p>
                </div>
              ))}
            </div>
            <p className="text-[#5C4E4A] leading-relaxed mt-8 italic">{c("fit_note", "")}</p>
          </div>
          <div className="lg:col-span-5">
            <div className="img-wash aspect-[4/5]">
              <img src={c("fit_image", "/api/static/corporate/occasions-table.jpg")} alt="A table set with Not A Salami for a corporate gathering" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Who should attend + what we'll discuss ---------------- */}
      <section className="bg-[#EAE4D9]/50 py-20 md:py-28 border-y border-[#DFD7CA]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-2 gap-14">
          <div>
            <p className="overline text-[#C05A3A]">{c("attend_overline", "Who should attend")}</p>
            <h2 className="font-serif text-3xl md:text-4xl leading-[1.08] mt-4 text-[#2A1F1D]">
              {c("attend_title", "Bring the people who will shape the decision")}
            </h2>
            <p className="text-[#5C4E4A] leading-relaxed mt-6">{c("attend_body", "")}</p>
          </div>
          <div>
            <p className="overline text-[#C05A3A]">{c("discuss_overline", "What we will discuss")}</p>
            <p className="text-[#5C4E4A] leading-relaxed mt-4">{c("discuss_intro", "After tasting the product, we will explore:")}</p>
            <ul className="mt-6 space-y-3 text-[#2A1F1D]">
              {discuss.map((d, i) => (
                <li key={d || i} className="flex gap-3">
                  <span className="text-[#B9935A]">—</span>
                  <span className="leading-relaxed">{d}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-[#5C4E4A] leading-relaxed mt-6 italic">{c("discuss_note", "")}</p>
          </div>
        </div>
      </section>

      {/* ---------------- Service area ---------------- */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-24">
        <p className="overline text-[#C05A3A]">{c("area_overline", "Service area")}</p>
        <h2 className="font-serif text-3xl md:text-4xl leading-[1.08] mt-4 max-w-3xl text-[#2A1F1D]">
          {c("area_title", "In-person tastings in the San Francisco Bay Area")}
        </h2>
        <p className="text-[#5C4E4A] leading-relaxed mt-6 max-w-2xl">{c("area_body1", "")}</p>
        <p className="text-[#5C4E4A] leading-relaxed mt-4 max-w-2xl">{c("area_body2", "")}</p>
      </section>

      {/* ---------------- Final call to action (brand colour, no photograph) ---------------- */}
      <section className="bg-[#C05A3A] text-[#F9F6F0] py-20 md:py-24" data-testid="corporate-final-cta">
        <div className="max-w-[900px] mx-auto px-6 md:px-10 text-center">
          <h2 className="font-serif text-4xl md:text-5xl leading-[1.05]">{c("cta_title", "Request a tasting")}</h2>
          <p className="text-[#FBF7EE] leading-relaxed mt-6 max-w-2xl mx-auto">{c("cta_body", "")}</p>
          <button onClick={goToForm} className="btn-primary mt-10 !bg-[#2A1F1D] !border-[#2A1F1D] inline-flex items-center gap-2" data-testid="corporate-cta-final">
            {c("cta_button", "Request a tasting")} <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* ---------------- Inquiry form ---------------- */}
      <section className="max-w-[900px] mx-auto px-6 md:px-10 py-20 md:py-28">
        <p className="overline text-[#C05A3A]">Corporate inquiry</p>
        <h2 className="font-serif text-3xl md:text-5xl leading-[1.08] mt-4 text-[#2A1F1D]">
          {c("form_heading", "Tell us about your corporate occasion")}
        </h2>
        <p className="text-[#5C4E4A] leading-relaxed mt-5 mb-12">{c("form_intro", "A few details will help us prepare for the conversation. Estimates are welcome.")}</p>
        <CorporateInquiryForm c={c} formRef={formRef} />
      </section>
    </div>
  );
}
