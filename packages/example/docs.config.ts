import { defineDocs } from "@erikt/docgen";

export default defineDocs({
  base: "/docgen",
  githubLink: 'https://github.com/erikthalen/docgen',
  structure: [
    { label: "Guide", path: "/guide", icon: "book" },
    { label: "API", path: "/api", icon: "code" },
  ],
});
