import { defineDocs } from "@erikt/docgen";

export default defineDocs({
  port: 5152,
  brandColor: "light-dark(#111, #fff)",
  siteName: "Example Docgen",
  githubLink: "https://github.com/erikthalen/docgen",
  structure: [
    { label: "Guide", path: "/guide", icon: "book" },
    { label: "API", path: "/api", icon: "code" },
  ],
});
