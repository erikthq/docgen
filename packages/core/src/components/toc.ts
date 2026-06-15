import { html, safe, SafeHtml } from "#html";
import { icon } from "../utils/icons.js";

const headingPattern = /<h([1-6])[^>]*\sid="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/gi;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export async function toc(content: SafeHtml): Promise<SafeHtml> {
  const headings: { level: number; id: string; text: string }[] = [];

  for (const match of content.value.matchAll(headingPattern)) {
    headings.push({
      level: parseInt(match[1]),
      id: match[2],
      text: stripTags(match[3]).trim(),
    });
  }

  if (headings.length === 0) return new SafeHtml("");

  return html`<nav class="toc">
      <p>${await icon("list-tree")} On this page</p>

      <ul x-data="toc">
        ${headings.map(
          ({ level, id, text }) =>
            html`<li>
              <a href="#${id}" class="toc-level-${level}">${text}</a>
            </li> `,
        )}
      </ul>
    </nav>

    <script type="module">
      import Alpine from "alpinejs";

      Alpine.data("toc", () => ({
        visible: new Set(),
        links: [],

        updateActive() {
          this.links.forEach((a) => {
            const isActive = this.visible.has(a.getAttribute("href").slice(1));
            a.ariaCurrent = isActive ? "true" : null;
            a.style.setProperty("anchor-name", "");
          });

          const active = this.links.filter((a) => {
            return this.visible.has(a.getAttribute("href").slice(1));
          });

          if (active.length === 1) {
            active
              .at(0)
              .style.setProperty("anchor-name", "--toc-start, --toc-end");
          } else if (active.length > 1) {
            active.at(0).style.setProperty("anchor-name", "--toc-start");
            active.at(-1).style.setProperty("anchor-name", "--toc-end");
          }
        },

        smoothScroll(enable) {
          if (enable) {
            document.documentElement.style.scrollBehavior = "smooth";
          } else {
            document.documentElement.style.removeProperty("scroll-behavior");
          }
        },

        init() {
          this.links = [...this.$root.querySelectorAll("a")];

          const observer = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                entry.isIntersecting
                  ? this.visible.add(entry.target.id)
                  : this.visible.delete(entry.target.id);
              }

              this.updateActive();
            },
            { rootMargin: "0px 0px 0% 0px", threshold: 0 },
          );

          for (const link of this.links) {
            const heading = document.getElementById(
              link.getAttribute("href").slice(1),
            );

            if (heading) {
              observer.observe(heading);
            }

            link.addEventListener("click", () => {
              this.smoothScroll(true);
              setTimeout(() => this.smoothScroll(false), 1000);
            });
          }
        },
      }));
    </script> `;
}
