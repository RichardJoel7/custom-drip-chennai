"use client";

import { usePathname } from "next/navigation";
import { PhoneIcon, WhatsAppIcon } from "@/components/icons/social-icons";
import { cn } from "@/lib/utils/cn";
import { telUrl, whatsappUrl } from "@/lib/utils/contact-links";

const BUTTON =
  "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-black/25 ring-2 ring-white/90 transition-transform hover:scale-105 sm:h-14 sm:w-14";

export function ContactFloaters({
  whatsappNumber,
  callNumber,
}: {
  whatsappNumber: string | null;
  callNumber: string | null;
}) {
  const pathname = usePathname();
  if (!whatsappNumber && !callNumber) return null;

  // The Custom Studio has its own price bar pinned to the bottom below lg.
  const aboveStudioBar = pathname === "/customize";

  return (
    <div
      className={cn(
        "fixed right-4 z-30 flex flex-col gap-3 sm:right-6",
        aboveStudioBar ? "bottom-24 lg:bottom-6" : "bottom-4 sm:bottom-6"
      )}
    >
      {whatsappNumber && (
        <a
          href={whatsappUrl(whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className={`${BUTTON} bg-[#25D366]`}
        >
          <WhatsAppIcon className="h-6 w-6 sm:h-7 sm:w-7" />
        </a>
      )}
      {callNumber && (
        <a href={telUrl(callNumber)} aria-label="Call us" className={`${BUTTON} bg-foreground`}>
          <PhoneIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </a>
      )}
    </div>
  );
}
