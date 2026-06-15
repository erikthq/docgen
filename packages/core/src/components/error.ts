import { html } from "#html";
import { icon } from "../utils/icons.js";

export default html`
  <div class="empty">
    ${await icon('error-404')}
    <h3>Page not found</h3>
    <p>This page doesn't exist or may have been moved.</p>
    <a href="/" class="button">Back to homepage</a>
  </div>
`;
