import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

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
  "[&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground",
  "[&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground",
  "[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6",
  "[&_table]:mt-4 [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:py-2 [&_th]:pr-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_td]:border-b [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top",
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

/** `gfm` enables tables (GitHub-flavored Markdown); the admin docs use them. */
export function Prose({ children, gfm = false }: { children: string; gfm?: boolean }) {
  return (
    <div className={PROSE_CLASS}>
      <ReactMarkdown components={components} remarkPlugins={gfm ? [remarkGfm] : []}>{children}</ReactMarkdown>
    </div>
  );
}
