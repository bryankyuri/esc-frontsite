import { Fragment } from "react";

// Renders a plain i18n string but turns the term "WordNet" into a link to
// Princeton WordNet (opens in a new tab). "Princeton" is prepended so the source
// reads as a recognizable institution, like Oxford. Strings without the term
// render unchanged.
const TERM = "WordNet";
const LABEL = "Princeton WordNet";
const HREF = "https://wordnet.princeton.edu/";

export default function RichText({ text }: { readonly text: string }) {
  const parts = text.split(TERM);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={`p${i}`}>
          {part}
          {i < parts.length - 1 && (
            <a
              href={HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2 hover:opacity-80"
            >
              {LABEL}
            </a>
          )}
        </Fragment>
      ))}
    </>
  );
}
