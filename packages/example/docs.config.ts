import { defineDocs } from "@erikt/docgen";

export default defineDocs({
  base: "/docgen",
  structure: [
    { label: "Guide", path: "/guide", icon: "book" },
    { label: "API", path: "/api", icon: "code" },
  ],
});
