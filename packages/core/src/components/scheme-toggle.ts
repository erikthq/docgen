import { html } from "#html";
import { icon } from "../utils/icons.js";

export default html`
  <fieldset class="scheme-toggle" role="group">
    <label class="toggle square" aria-label="Light" data-tooltip="bottom">
      <input type="radio" name="align" />
      ${await icon("sun")}
    </label>
    <label class="toggle square" aria-label="Dark" data-tooltip="bottom">
      <input type="radio" name="align" checked />
      ${await icon("moon")}
    </label>
    <label class="toggle square" aria-label="System" data-tooltip="bottom">
      <input type="radio" name="align" />
      ${await icon("device-desktop")}
    </label>
  </fieldset>

  <script>
    const SCHEMES = ["light", "dark", "revert-layer"];
    const inputs = document.querySelectorAll(".scheme-toggle input");

    function applyScheme(scheme) {
      document.documentElement.style.colorScheme = scheme;
      document.documentElement.dataset.colorScheme = scheme;
      inputs.forEach((input, i) => (input.checked = SCHEMES[i] === scheme));
    }

    applyScheme(localStorage.getItem("color-scheme") ?? "revert-layer");

    inputs.forEach((input, i) => {
      input.addEventListener("change", () => {
        const scheme = SCHEMES[i];
        localStorage.setItem("color-scheme", scheme);
        applyScheme(scheme);
      });
    });
  </script>
`;
