export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2.4A9.6 9.6 0 0 0 3.4 17L2 22l5.2-1.4A9.6 9.6 0 1 0 12 2.4Zm5.6 13.7c-.24.66-1.4 1.27-1.94 1.34-.5.06-1.11.09-1.8-.11-.4-.13-.94-.3-1.6-.6-2.83-1.23-4.68-4.1-4.82-4.3-.14-.19-1.15-1.53-1.15-2.92 0-1.4.73-2.08.99-2.36.26-.29.57-.36.76-.36h.55c.18 0 .42-.03.65.5.24.55.8 1.9.87 2.03.07.14.11.3.02.48-.09.19-.14.3-.28.46l-.4.47c-.14.14-.28.29-.12.57.16.29.72 1.22 1.55 1.98 1.07.98 1.96 1.29 2.25 1.43.28.14.45.12.62-.07.17-.19.72-.84.9-1.13.19-.29.38-.24.63-.14.26.09 1.63.78 1.9.92.29.14.47.21.54.33.07.13.07.72-.17 1.38Z" />
    </svg>
  );
}
