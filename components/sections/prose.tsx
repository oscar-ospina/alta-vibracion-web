import ReactMarkdown, { type Components } from "react-markdown";

/**
 * Renders trusted, in-repo Markdown content (the legal/contact copy) as styled
 * prose (story oscar-ospina/saas-planner#26). Server component — react-markdown
 * runs at build time. No @tailwindcss/typography dependency: spacing/typography
 * are applied via descendant utilities so the markup stays semantic HTML.
 *
 * Input is our own vetted .md (never user input), so raw HTML is not enabled.
 */
const PROSE_CLASS = [
  "text-base text-muted-foreground",
  "[&>:first-child]:mt-0",
  "[&_h2]:mt-9 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground",
  "[&_p]:mt-4 [&_p]:leading-relaxed",
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6",
  "[&_li]:leading-relaxed [&_li]:marker:text-violet-400",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_em]:italic",
  "[&_a]:rounded-sm [&_a]:font-medium [&_a]:text-brand-ink [&_a]:underline [&_a]:underline-offset-2",
  "[&_a:focus-visible]:outline-[3px] [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-ring",
].join(" ");

// Open external links safely in a new tab; in-app links keep default behavior.
const components: Components = {
  a({ href, children }) {
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
};

export function Prose({ children }: { children: string }) {
  return (
    <div className={PROSE_CLASS}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
