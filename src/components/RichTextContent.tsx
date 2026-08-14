import DOMPurify from "dompurify";
import { cn } from "../lib/utils";

const supportedMarkup = /<\/?(?:p|br|strong|b|em|i|u|h2|h3|ul|ol|li|blockquote|a)(?:\s[^>]*)?>/i;

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const normalizeLegacyText = (value: string) => {
  if (supportedMarkup.test(value)) {
    return value.replace(
      /<p(?:\s[^>]*)?>(?:\s|&nbsp;|<br\s*\/?\s*>)*<\/p>/gi,
      "",
    );
  }

  return value
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim().length > 0)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
};

const normalizeTextAlignment = (value: string) =>
  value
    .replace(/\sstyle\s*=\s*(["'])(.*?)\1/gi, (_attribute, _quote, styles: string) => {
      const alignment = styles.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\s*(?:;|$)/i);
      return alignment ? ` style="text-align: ${alignment[1].toLowerCase()}"` : "";
    })
    .replace(/\sstyle\s*=\s*(?!["'])[^\s>]+/gi, "");

interface RichTextContentProps {
  content: string;
  className?: string;
}

export const RichTextContent = ({ content, className }: RichTextContentProps) => {
  const normalizedContent = content.replace(/\uF0A7/g, "•");
  const sharedClassName = cn(
    "break-words [&_a]:font-semibold [&_a]:text-[var(--color-secondary)] [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-border)] [&_blockquote]:pl-4 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-[var(--color-text)] [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[var(--color-text)] [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
    className,
  );

  const safeHtml = DOMPurify.sanitize(normalizeTextAlignment(normalizeLegacyText(normalizedContent)), {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "h2", "h3", "ul", "ol", "li", "blockquote", "a"],
    ALLOWED_ATTR: ["href", "target", "rel", "style"],
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });

  return <div className={sharedClassName} dangerouslySetInnerHTML={{ __html: safeHtml }} />;
};
