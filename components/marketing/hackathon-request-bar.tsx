"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { ROUTES } from "@/lib/constants";

/**
 * A slim, search-bar-styled prompt on the landing page: type your hackathon's
 * name, hit enter, and land on /request with a pre-drafted email to the team.
 */
export function HackathonRequestBar() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go() {
    const q = value.trim();
    router.push(q ? `${ROUTES.request}?hackathon=${encodeURIComponent(q)}` : ROUTES.request);
  }

  return (
    <section className="border-b border-line bg-canvas">
      <div className="container-marketing py-16">
        <Reveal y={14}>
          <div className="mx-auto max-w-[680px] text-center">
            <h2 className="mb-6 font-serif text-[clamp(24px,2.6vw,32px)] font-normal leading-[1.15] tracking-[-0.015em]">
              Want us at <span className="italic text-accent">your</span> hackathon?
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                go();
              }}
              className="group relative mx-auto flex max-w-[520px] items-center rounded-full border border-line bg-surface shadow-card transition-all duration-300 focus-within:border-accent/50 focus-within:shadow-[0_14px_40px_-16px_rgba(93,95,239,0.35)] hover:border-line-dark/20"
            >
              <Search
                className="pointer-events-none ml-5 h-[17px] w-[17px] flex-shrink-0 text-faint transition-colors group-focus-within:text-accent"
                strokeWidth={2}
              />
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter your hackathon's name…"
                aria-label="Your hackathon's name"
                className="w-full bg-transparent px-3.5 py-[15px] text-[15px] text-ink placeholder:text-faint"
              />
              <button
                type="submit"
                className="mr-2 flex-shrink-0 rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_8px_22px_-8px_rgba(93,95,239,0.6)] active:scale-[0.97]"
              >
                Reach out
              </button>
            </form>
            <p className="mt-4 text-[14px] font-semibold text-ink">
              We&apos;ll draft the email for you. It takes about a minute.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
