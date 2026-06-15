import Alpine from "alpinejs";
import { html } from "html.js";

Alpine.data("copyCode", () => ({
  template: html`
    <label
      class="toggle ghost square"
      aria-label="Copy code"
      data-tooltip="left"
    >
      <input type="checkbox" />
      <svg
        data-unchecked
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666"
        />
        <path
          d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"
        />
      </svg>
      <svg
        data-checked
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="color: var(--ui-constructive)"
      >
        <path d="M5 12l5 5l10 -10" />
      </svg>
    </label>
  `,

  init() {
    const span = document.createElement("span");
    span.innerHTML = this.template;
    span.className = "copy-code";

    span.addEventListener("change", async () => {
      const code = this.$el.querySelector("code")?.innerText ?? "";
      await navigator.clipboard.writeText(code);

      const label = span.querySelector("label");
      label.setAttribute("aria-label", "Copied");

      setTimeout(() => {
        label.setAttribute("aria-label", "Copy code");
        span.querySelector("input").checked = false;
      }, 1000);
    });

    this.$el.appendChild(span);
  },
}));
