"use client";

import { InstagramIcon, LinkedInIcon, MailIcon } from "@/components/icons/social-icons";

const DEVELOPER = {
  name: "Richard Joel",
  linkedin: "https://www.linkedin.com/in/richardjoeld",
  instagram: "https://www.instagram.com/richard_jo_7/",
  // Kept in two parts and joined only on click, so the address never sits in the page for spam bots to find.
  email: ["richardjoel5678", "gmail.com"],
};

const ICON =
  "flex h-8 w-8 items-center justify-center rounded-full border border-background/30 text-background/80 transition-colors hover:bg-background hover:text-foreground focus-visible:outline-accent!";

/** The site's credit line in the footer: who designed, built and runs it, with their links. */
export function DeveloperCredit() {
  function emailMe() {
    const link = document.createElement("a");
    link.href = `mailto:${DEVELOPER.email.join("@")}`;
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:gap-3">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] sm:text-right">
        Designed · Developed · Deployed by{" "}
        <span className="whitespace-nowrap text-background">{DEVELOPER.name}</span>
      </p>
      <div className="flex gap-2">
        <a href={DEVELOPER.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${DEVELOPER.name} on LinkedIn`} className={ICON}>
          <LinkedInIcon className="h-4 w-4" />
        </a>
        <a href={DEVELOPER.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${DEVELOPER.name} on Instagram`} className={ICON}>
          <InstagramIcon className="h-4 w-4" />
        </a>
        <button type="button" onClick={emailMe} aria-label={`Email ${DEVELOPER.name}`} className={ICON}>
          <MailIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
