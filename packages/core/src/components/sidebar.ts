import { html, safe, SafeHtml } from "#html";

export function sidebar(
  routes: Map<string, SafeHtml>,
  labels: Map<string, string>,
  currentRoute: string,
  base = "",
): SafeHtml {
  const routeKeys = [...routes.keys()];

  const sections = new Set(
    routeKeys
      .filter((r) => r !== "/")
      .map((r) => r.split("/").slice(0, -1).join("/") || "/")
      .filter((parent) => parent !== "/"),
  );

  const section = [...sections].find(
    (s) => currentRoute === s || currentRoute.startsWith(s + "/"),
  );

  if (!section) return new SafeHtml("");

  const children = routeKeys.filter(
    (r) => r === section || r.startsWith(section + "/"),
  );

  if (children.length === 0) return new SafeHtml("");

  const label = section.split("/").filter(Boolean).pop() ?? section;

  return html`<menu>
    <li><small>${label}</small></li>
    ${children.map((r) => {
      const name =
        labels.get(r) ??
        (r === section ? "overview" : (r.split("/").pop() ?? r));
      const active = r === currentRoute;
      return html`<li>
        <a
          href="${base}${r}"
          class="button ghost"
          ${active && html`aria-current="page"`}
        >
          ${name}
        </a>
      </li>`;
    })}
  </menu>`;
}
