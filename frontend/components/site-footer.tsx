export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`px-4 py-6 text-center text-sm text-mist ${className}`}
    >
      <p>
        Copyright © {new Date().getFullYear()} MiniFT. All rights reserved.
      </p>
      <p className="mt-2">
        Made by{" "}
        <a
          className="text-signal transition hover:text-white"
          href="https://addisonreyes.com"
          target="_blank"
          rel="noreferrer"
        >
          Addison Reyes
        </a>
      </p>
    </footer>
  );
}
