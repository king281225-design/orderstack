/**
 * Renders a schema.org JSON-LD <script> tag. `data` is trusted, server-built
 * input only — never pass raw user text through unescaped. `<` is escaped
 * as < so a string value can never accidentally close the <script> tag
 * early (e.g. a value containing "</script>").
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
