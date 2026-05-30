import { jsx } from "jinx";
import { beforeEach, describe, expect, expectTypeOf, test } from "vitest";

// c.f. https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements
const HTML_TAGS = [
  "a",
  "abbr",
  "acronym",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "big",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "center",
  "cite",
  "code",
  "col",
  "colgroup",
  // TODO: obsolete, confirm in all browsers if HTMLUnknownElement
  // "content",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fencedframe",
  "fieldset",
  "figcaption",
  "figure",
  "font",
  "footer",
  "form",
  "frame",
  "frameset",
  "geolocation",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  // TODO: obsolete, confirm in all browsers if HTMLUnknownElement
  // "image",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "marquee",
  // MathMLElement
  // "math",
  "menu",
  // TODO: obsolete, confirm in all browsers if HTMLUnknownElement
  // "menuitem",
  "meta",
  "meter",
  "nav",
  "nobr",
  "noembed",
  "noframes",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "plaintext",
  "pre",
  "progress",
  "q",
  "rb",
  "rp",
  "rt",
  "rtc",
  "ruby",
  "s",
  "samp",
  "script",
  "search",
  "section",
  "select",
  "selectedcontent",
  // TODO: obsolete, confirm in all browsers if HTMLUnknownElement
  // "shadow",
  "slot",
  "small",
  "source",
  "span",
  "strike",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  // SVGSVGElement
  // "svg",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "tt",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  "xmp",
];

// c.f. https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element
const SVG_TAGS = [
  // TODO: overlaps with HTML tag name
  // "a",
  "animate",
  "animateMotion",
  "animateTransform",
  "circle",
  "clipPath",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  // TODO: overlaps with HTML tag name
  // "script",
  "set",
  "stop",
  // TODO: overlaps with HTML tag name
  // "style",
  "svg",
  "switch",
  "symbol",
  "text",
  "textPath",
  // TODO: overlaps with HTML tag name
  // "title",
  "tspan",
  "use",
  "view",
];

// c.f. https://developer.mozilla.org/en-US/docs/Web/MathML
const MATH_ML_TAGS = [
  "math",
  "maction",
  "annotation",
  "annotation",
  "menclose",
  "merror",
  "mfenced",
  "mfrac",
  "mi",
  "mmultiscripts",
  "mn",
  "mo",
  "mover",
  "mpadded",
  "mphantom",
  "mprescripts",
  "mroot",
  "mrow",
  "ms",
  "semantics",
  "mspace",
  "msqrt",
  "mstyle",
  "msub",
  "msup",
  "msubsup",
  "mtable",
  "mtd",
  "mtext",
  "mtr",
  "munder",
  "munderover",
];

describe("Elements", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("creates HTMLElement", async () => {
    for (const key of HTML_TAGS) {
      const element = jsx(key, {});
      expect(element).toBeInstanceOf(HTMLElement);
    }
  });

  test("creates SVGElement", async () => {
    for (const key of SVG_TAGS) {
      const element = jsx(key, {});
      expect(element).toBeInstanceOf(SVGElement);
    }
  });

  test("create MathMLElement", async () => {
    for (const key of MATH_ML_TAGS) {
      const element = jsx(key, {});
      expect(element).toBeInstanceOf(MathMLElement);
    }
  });

  test("should render", async () => {
    document.body.append(<div />);
    const div = document.querySelector("div");
    await expect.element(div).toBeInTheDocument();
  });

  test("should not have any attributes", async () => {
    const div = (<div />) as HTMLElement;
    document.body.append(div);
    expect(div.attributes.length === 0);
  });

  test("conditional rendering and short-circuit expressions", async () => {
    document.body.appendChild(
      <>
        <h1 style={{ color: "green" }}>title</h1>
        {true && <marquee>true shortcircuit!</marquee>}
        {false && <marquee>false shortcircuit!</marquee>}
        {true ? <div>true tern!</div> : <div>false tern!</div>}
        {false ? <div>true tern!</div> : <div>false tern!</div>}
        {true && true}
        {false && false}
      </>
    );

    expect(document.body.childNodes?.[0]?.nodeName).toBe("H1");
    expect(document.body.childNodes?.[1]?.nodeName).toBe("MARQUEE");
    expect(document.body.childNodes?.[2]?.nodeName).toBe("#comment");
    expect(document.body.childNodes?.[3]?.nodeName).toBe("DIV");
    expect(document.body.childNodes?.[4]?.nodeName).toBe("DIV");
  });

  test("css style object applied to element", async () => {
    document.body.appendChild(
      <div
        id="div"
        style={{
          backgroundColor: "red",
          fontSize: "72px",
          fontWeight: "900",
        }}
      >
        Testing
      </div>
    );

    expect(document.body.childNodes[0]?.nodeName).toBe("DIV");
    const div = document.querySelector<HTMLDivElement>("#div")!;
    expect(div).toBeInTheDocument();
    expect(div.style.backgroundColor).toBe("red");
    expect(div.style.fontSize).toBe("72px");
    expect(div.style.fontWeight).toBe("900");
  });
});
