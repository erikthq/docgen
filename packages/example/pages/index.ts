import { html, safe } from "@erikt/docgen";
import { createHighlighter } from "shiki";

const highlighter = await createHighlighter({
  themes: ["github-light", "github-dark"],
  langs: ["bash", "ts"],
});

function highlight(code: string, lang: "bash" | "ts"): string {
  return highlighter.codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}

const installCmd = highlight("pnpm add @erikt/docgen", "bash");

const configSnippet = highlight(
  `import { defineDocs } from "@erikt/docgen";

export default await defineDocs({
  structure: [{ label: "Guide", path: "/guide", icon: "book" }],
});`,
  "ts",
);

const runCmd = highlight(
  `pnpm docgen dev\n# listening on http://localhost:5151`,
  "bash",
);

export default html`
  <style>
    .home {
      display: grid;
      gap: 6rem;
      padding-block: 6rem;
    }

    .home-hero {
      display: grid;
      place-items: center;
      text-align: center;
      gap: 1.5rem;
      padding-inline: 2rem;

      h1 {
        font-size: clamp(3.5rem, 12vw, 8rem);
        letter-spacing: -0.04em;
        line-height: 1;
      }

      p {
        font-size: clamp(1.1rem, 2.5vw, 1.35rem);
        max-width: 44ch;
      }
    }

    .home-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .home-features {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1px;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      margin-inline: 2rem;
      background: var(--border-color);

      max-width: 800px;
      margin-inline: auto;

      @media (width >= 768px) {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .home-feature {
      display: grid;
      gap: 0.4rem;
      padding: 1.75rem;
      background: var(--ui-background-color);

      strong {
        font-size: 0.95rem;
        font-weight: 600;
      }

      p {
        font-size: 0.875rem;
        color: var(--ui-neutral-500);
        line-height: 1.55;
        margin: 0;
      }
    }

    .home-quickstart {
      display: grid;
      gap: 2rem;
      max-width: 680px;
      margin-inline: auto;
      padding-inline: 2rem;
      width: 100%;
      box-sizing: border-box;

      h2 {
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin: 0;
      }
    }

    .home-steps {
      display: grid;
      gap: 0;
      counter-reset: step;
    }

    .home-step {
      display: grid;
      grid-template-columns: 2rem 1fr;
      gap: 0 1rem;
      counter-increment: step;

      &::before {
        content: counter(step);
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--ui-neutral-400);
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        border: 1px solid var(--border-color);
        display: grid;
        place-items: center;
        margin-top: 0.2rem;
        flex-shrink: 0;
      }

      &:not(:last-child) {
        padding-bottom: 2rem;

        &::after {
          content: "";
          grid-column: 1;
          border-left: 1px solid var(--border-color);
          margin-left: 1rem;
        }
      }

      > div {
        grid-column: 2;
        display: grid;
        gap: 0.75rem;
        margin-top: 0.66rem;

        p {
          font-size: 0.875rem;
          color: var(--ui-neutral-500);
          margin: 0;
        }
      }

      strong {
        font-size: 0.95rem;
      }
    }
  </style>

  <div class="home">
    <section class="home-hero prose">
      <hgroup>
        <h1>docgen</h1>
        <p>
          A documentation site generator for developers who want a fast,
          readable site without pulling in a framework.
        </p>
      </hgroup>

      ${safe(installCmd)}

      <div class="home-actions">
        <a href="/docgen/guide" class="button">Get started</a>
        <a href="/docgen/api" class="button ghost">API reference</a>
      </div>
    </section>

    <div class="home-features">
      <div class="home-feature">
        <strong>No build step</strong>
        <p>
          Runs TypeScript directly via Node.js &ge;23.6. No tsc, no esbuild, no
          config.
        </p>
      </div>
      <div class="home-feature">
        <strong>File-based routing</strong>
        <p>
          Drop a <code>.md</code> or <code>.ts</code> file in
          <code>pages/</code> and it becomes a route. No config required.
        </p>
      </div>
      <div class="home-feature">
        <strong>Static output</strong>
        <p>
          <code>docgen build</code> writes plain HTML files deployable to GitHub
          Pages or any static host.
        </p>
      </div>
      <div class="home-feature">
        <strong>Syntax highlighting</strong>
        <p>
          Code blocks are highlighted at build time via Shiki with accurate
          language grammars and light/dark themes.
        </p>
      </div>
      <div class="home-feature">
        <strong>Light &amp; dark mode</strong>
        <p>
          Follows the system preference out of the box, with a toggle that
          persists across visits.
        </p>
      </div>
      <div class="home-feature">
        <strong>Search</strong>
        <p>
          Full-text search across all pages powered by MiniSearch — no server,
          no indexing pipeline.
        </p>
      </div>
    </div>

    <section class="home-quickstart">
      <h2>Quick start</h2>
      <div class="home-steps">
        <div class="home-step">
          <div>
            <strong>Install</strong>
            ${safe(installCmd)}
          </div>
        </div>
        <div class="home-step">
          <div>
            <strong>Configure</strong>
            <p>Create <code>docs.config.ts</code> in your project root.</p>
            ${safe(configSnippet)}
          </div>
        </div>
        <div class="home-step">
          <div>
            <strong>Run</strong>
            ${safe(runCmd)}
          </div>
        </div>
      </div>
    </section>
  </div>
`;
