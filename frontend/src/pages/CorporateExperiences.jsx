import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ArrowRight, Calendar, Clock, MapPin, Users } from "lucide-react";
import { CONTACT } from "../content";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ---------------------------------------------------------------------------
// Corporate inquiry form — structured fields Eva asked for: company, contact,
// preferred date, location, number of guests, occasion, special requirements.
// ---------------------------------------------------------------------------
function CorporateInquiryForm({ requestType, onTypeChange }) {
  const [form, setForm] = useState({
    type: requestType || "tasting",
    company: "",
    name: "",
    email: "",
    phone: "",
    preferred_date: "",
    location: "",
    num_guests: "",
    occasion: "",
    special_requirements: "",
    message: "",
  });
  const [status, setStatus] = useState("idle"); // idle | loading | ok | err

  // Keep the form's selected request type in sync when the parent changes it
  // (e.g. the hero CTAs "Book a Corporate Tasting" / "Request a Corporate
  // Proposal" scroll to the form with a specific type preselected).
  useEffect(() => {
    if (requestType) {
      setForm((f) => (f.type === requestType ? f : { ...f, type: requestType }));
    }
  }, [requestType]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const typeLabel =
    form.type === "proposal"
      ? "Request a Corporate Proposal"
      : "Book a Corporate Tasting";

  const submit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await axios.post(`${API}/inquiries`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        subject: typeLabel,
        message:
          form.message ||
          (form.type === "proposal"
            ? "Corporate proposal request"
            : "Corporate tasting request"),
        kind: form.type === "proposal" ? "corporate_proposal" : "corporate_tasting",
        company: form.company,
        preferred_date: form.preferred_date,
        location: form.location,
        num_guests: form.num_guests,
        occasion: form.occasion,
        special_requirements: form.special_requirements,
      });
      setStatus("ok");
    } catch (err) {
      setStatus("err");
    }
  };

  if (status === "ok") {
    return (
      <div className="bg-[#FBF7EE] border border-[#DFD7CA] p-8 md:p-12 text-center" data-testid="corporate-form-success">
        <p className="overline text-[#C05A3A]">Grazie</p>
        <h3 className="font-serif text-3xl md:text-4xl text-[#2A1F1D] mt-3">
          Your request is in Eva's inbox.
        </h3>
        <p className="text-[#5C4E4A] max-w-md mx-auto mt-4 leading-relaxed">
          She reads every note personally and will reply within two business days
          with dates and options for your {form.type === "proposal" ? "proposal" : "tasting"}.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="btn-outline mt-8 text-sm"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-7" data-testid="corporate-inquiry-form">
      {/* Request type toggle */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { key: "tasting", title: "Book a Corporate Tasting", sub: "In-person, Bay Area" },
          { key: "proposal", title: "Request a Corporate Proposal", sub: "Gifting program or event" },
        ].map((opt) => (
          <button
            type="button"
            key={opt.key}
            onClick={() => {
              setForm({ ...form, type: opt.key });
              if (onTypeChange) onTypeChange(opt.key);
            }}
            className={`text-left border p-5 transition-colors ${
              form.type === opt.key
                ? "border-[#2A1F1D] bg-[#FBF7EE]"
                : "border-[#DFD7CA] bg-white hover:border-[#B9935A]"
            }`}
            data-testid={`corporate-type-${opt.key}`}
          >
            <p className={`font-serif text-lg ${form.type === opt.key ? "text-[#2A1F1D]" : "text-[#5C4E4A]"}`}>
              {opt.title}
            </p>
            <p className="text-xs text-[#5C4E4A] mt-1 tracking-wide">{opt.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="field">
          <label htmlFor="co-company">Company name</label>
          <input id="co-company" type="text" required value={form.company} onChange={set("company")} placeholder="Company, Inc." data-testid="corporate-company-input" />
        </div>
        <div className="field">
          <label htmlFor="co-name">Contact person</label>
          <input id="co-name" type="text" required value={form.name} onChange={set("name")} placeholder="Your name" data-testid="corporate-name-input" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="field">
          <label htmlFor="co-email">Email</label>
          <input id="co-email" type="email" required value={form.email} onChange={set("email")} placeholder="you@company.com" data-testid="corporate-email-input" />
        </div>
        <div className="field">
          <label htmlFor="co-phone">Phone (optional)</label>
          <input id="co-phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+1 415 …" data-testid="corporate-phone-input" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="field">
          <label htmlFor="co-date">Preferred date</label>
          <input id="co-date" type="date" value={form.preferred_date} onChange={set("preferred_date")} data-testid="corporate-date-input" />
        </div>
        <div className="field">
          <label htmlFor="co-location">Location</label>
          <input id="co-location" type="text" value={form.location} onChange={set("location")} placeholder="Your office, venue, or our studio" data-testid="corporate-location-input" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="field">
          <label htmlFor="co-guests">Number of guests</label>
          <input id="co-guests" type="number" min="1" max="200" value={form.num_guests} onChange={set("num_guests")} placeholder="e.g. 12" data-testid="corporate-guests-input" />
        </div>
        <div className="field">
          <label htmlFor="co-occasion">Occasion</label>
          <input id="co-occasion" type="text" value={form.occasion} onChange={set("occasion")} placeholder="Client appreciation, team offsite, milestone…" data-testid="corporate-occasion-input" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="co-special">Special requirements</label>
        <textarea
          id="co-special"
          rows={3}
          value={form.special_requirements}
          onChange={set("special_requirements")}
          placeholder="Dietary needs, timing constraints, what you'd like the experience to accomplish…"
          data-testid="corporate-requirements-input"
        />
      </div>

      <div className="field">
        <label htmlFor="co-message">Anything else? (optional)</label>
        <textarea id="co-message" rows={2} value={form.message} onChange={set("message")} placeholder="Tell us more about the plan." data-testid="corporate-message-input" />
      </div>

      <div className="flex items-center gap-6 pt-2">
        <button type="submit" disabled={status === "loading"} className="btn-primary" data-testid="corporate-submit-button">
          {status === "loading" ? "Sending…" : `${typeLabel} →`}
        </button>
        {status === "err" && (
          <p className="text-sm text-[#C05A3A]">
            Something didn't go through. Try again, or email {CONTACT.email_primary} directly.
          </p>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Corporate Experiences page
// ---------------------------------------------------------------------------
export default function CorporateExperiences() {
  const [requestType, setRequestType] = useState("tasting");
  const formRef = useRef(null);

  const goToForm = (type) => {
    setRequestType(type);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const facts = [
    {
      icon: Users,
      title: "Group size",
      body: "Designed for teams of 6 to 40 — small groups get the full kitchen-side treatment, larger groups work beautifully as an offsite centerpiece.",
    },
    {
      icon: Clock,
      title: "Duration",
      body: "45–60 minutes, paced to fit a lunch hour or an afternoon offsite. Longer sessions can include a hands-on wrapping or pairing component.",
    },
    {
      icon: MapPin,
      title: "Service area",
      body: "The San Francisco Bay Area — from the Peninsula to the East Bay. Beyond the Bay by arrangement.",
    },
    {
      icon: Calendar,
      title: "Booking",
      body: "We typically confirm tastings 2–3 weeks out. Send the form below and Eva will reply within two business days.",
    },
  ];

  return (
    <div className="pt-[90px]" data-testid="corporate-experiences-page">
      {/* Hero */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-16 border-b border-[#DFD7CA]">
        <p className="overline text-[#C05A3A]">For Companies · San Francisco Bay Area</p>
        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight mt-5 max-w-4xl text-[#2A1F1D]">
          Bring your team to the{" "}
          <span className="italic text-[#C05A3A]">table.</span>
        </h1>
        <p className="mt-7 text-[#5C4E4A] leading-relaxed max-w-2xl text-lg">
          An in-person tasting of Not A Salami — led by Eva, made in small
          batches, and built around the story of a Sicilian confection that
          travels from Modica to your conference room. Corporate tastings,
          client appreciation moments, and milestone celebrations across the Bay Area.
        </p>
        <div className="mt-10 flex flex-wrap gap-4" data-testid="corporate-hero-ctas">
          <button onClick={() => goToForm("tasting")} className="btn-primary inline-flex items-center gap-2" data-testid="corporate-cta-tasting">
            Book a Corporate Tasting <ArrowRight size={14} />
          </button>
          <button onClick={() => goToForm("proposal")} className="btn-outline inline-flex items-center gap-2" data-testid="corporate-cta-proposal">
            Request a Corporate Proposal <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* Facts */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {facts.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title}>
                <Icon size={22} className="text-[#C05A3A]" />
                <p className="overline text-[#2A1F1D] mt-5">{f.title}</p>
                <p className="text-sm text-[#5C4E4A] leading-relaxed mt-2">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* What's included */}
      <section className="bg-[#2A1F1D] text-[#F9F6F0] py-20 md:py-28">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-2 gap-14">
          <div>
            <p className="overline text-[#B9935A]">The tasting</p>
            <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] mt-4">
              What's <span className="italic text-[#C05A3A]">included</span>
            </h2>
          </div>
          <ul className="space-y-6 text-[#DFD7CA] leading-relaxed">
            <li>
              <p className="font-serif text-xl text-[#F9F6F0]">A guided tasting with Eva</p>
              <p className="text-sm mt-2">
                The full story — how a cocoa salami from Modica, Sicily became a
                San Francisco ritual — told over a proper tasting of the Classic.
              </p>
            </li>
            <li>
              <p className="font-serif text-xl text-[#F9F6F0]">Flights &amp; pairings</p>
              <p className="text-sm mt-2">
                Tasting flights with suggested pairings (coffee, dessert wine,
                after-dinner service), so your team experiences it the way it was
                meant to be served.
              </p>
            </li>
            <li>
              <p className="font-serif text-xl text-[#F9F6F0]">Take-home for every guest</p>
              <p className="text-sm mt-2">
                A small not-a-salami keepsake or gift box for each attendee — the
                part that keeps the conversation going after the tasting ends.
              </p>
            </li>
            <li>
              <p className="font-serif text-xl text-[#F9F6F0]">Made to fit your moment</p>
              <p className="text-sm mt-2">
                Client appreciation, team offsites, onboarding rituals, holiday
                gatherings — tell us the occasion and we'll shape the tasting around it.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-24 border-b border-[#DFD7CA]">
        <p className="overline text-[#C05A3A]">How it works</p>
        <h2 className="font-serif text-4xl md:text-5xl text-[#2A1F1D] mt-4 leading-tight">
          Three steps to a <span className="italic text-[#C05A3A]">memorable</span> hour.
        </h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { n: "01", title: "Send the request", body: "Tell us your company, date, location, and guest count using the form below — two minutes, no call needed." },
            { n: "02", title: "Eva replies with options", body: "Within two business days you'll hear back with dates, format options, and pricing for your group size." },
            { n: "03", title: "Confirm and gather", body: "Lock the date. We arrive with everything — you just gather your people around the table." },
          ].map((s) => (
            <div key={s.n}>
              <p className="font-serif text-5xl text-[#B9935A]">{s.n}</p>
              <p className="font-serif text-xl text-[#2A1F1D] mt-4">{s.title}</p>
              <p className="text-sm text-[#5C4E4A] leading-relaxed mt-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section
        ref={formRef}
        className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28 scroll-mt-24"
        data-testid="corporate-form-section"
      >
        <div className="max-w-3xl">
          <p className="overline text-[#C05A3A]">Inquire</p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#2A1F1D] mt-4 leading-tight">
            Tell us about your <span className="italic text-[#C05A3A]">event.</span>
          </h2>
          <p className="mt-5 text-[#5C4E4A] leading-relaxed">
            Prefer email? Reach {CONTACT.email_primary} directly — or use the form
            and it lands straight in Eva's inbox.
          </p>
          <div className="mt-10">
            <CorporateInquiryForm requestType={requestType} onTypeChange={setRequestType} />
          </div>
        </div>
      </section>
    </div>
  );
}
