/** Renders a schema.org JSON-LD <script> tag. `data` is trusted, server-built input only — never pass raw user text through unescaped. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
