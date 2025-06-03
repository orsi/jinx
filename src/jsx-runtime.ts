type Children = JSX.Element | string | number;
type AppRoot = {
  index: number;
  target: Element;
  _inProgress?: RenderFrame;
  frames: RenderFrame[];
  render: (element: RenderableItems) => RenderFrame;
  update: (newTarget: Element, element: RenderableItems, _inProgress: RenderFrame) => RenderFrame;
  setRenderingFrame: (frame: RenderFrame) => void;
  getCurrent: () => RenderFrame | undefined;
};
type TextRender = string | number | boolean;
type Renderable = JSX.Element | TextRender;
type RenderableItems = Renderable | Renderable[];

interface RenderFrame<T = any> {
  app: AppRoot;
  createdAt: number;
  frame: number;
  props: {
    target: Element;
    element: RenderableItems;
  };
  //
  container?: Text | HTMLElement | JSX.Element;
  index?: number;
  states?: {
    index: 0;
    values: T[];
  };
  previous?: RenderFrame;
  parent?: RenderFrame;
  children: RenderFrame[];
}

const APPS: any[] = [];
let currentApp: any | undefined;

function getCurrentApp() {
  return currentApp!;
}

export function createRoot(target: Element) {
  let app: any = {
    index: APPS.length,
    target,
    frames: [],
    render: (element: RenderableItems, previous?: any) => {
      currentApp = app;
      const rendering = {
        app,
        previous,
      };
      const rendered = render(target, element, rendering);
      app.frames.push(rendered);
      return rendered;
    },
    update: (previous?: any) => {
      const t0 = performance.now();

      currentApp = app;
      const rendering = {
        app,
        previous,
      };
      const rendered = render(previous.target, previous.element, rendering);
      app.frames.push(rendered);
      const t1 = performance.now();
      console.log(`update: ${t1 - t0} milliseconds.`);
      return rendered;
    },
    setCurrent(rendering) {
      app.rendering = rendering;
    },
    getCurrent() {
      return app.rendering;
    },
  };
  APPS.push(app);
  return app;
}

function render(target: Node, element: RenderableItems, rendering: any) {
  rendering.app.setCurrent(rendering);

  const tag = element?.tag?.name ?? element?.tag ?? element;
  const type = Array.isArray(element)
    ? "children"
    : typeof element === "string" || typeof element === "number"
    ? "text"
    : typeof element === "object" && typeof element.tag === "string"
    ? "html"
    : "function";

  let node: Node = rendering?.previous?.node;
  let children: ReturnType<typeof render>[] = [];

  const sameTarget = rendering?.previous?.target === target;
  const sameTag = rendering?.previous?.tag === tag;
  const sameType = rendering?.previous?.type === type;
  // console.log(`${tag} - sameTarget? ${sameTarget}, sameTag? ${sameTag}, sameType? ${sameType},`);

  switch (type) {
    case "children": {
      // children
      element = element as Renderable[];
      const _children = element?.filter((child) => typeof child !== "boolean")?.flat() ?? [];
      for (const [i, child] of _children?.entries()) {
        const rendered = render(target, child, {
          app: rendering.app,
          parent: rendering,
          previous: rendering.previous?.children[i],
        });
        children.push(rendered);
      }
      break;
    }
    case "text": {
      // text
      element = element as TextRender;
      const text = element.toString();
      if (node == null) {
        node = document.createTextNode(text);
        target.appendChild(node);
      } else {
        node.textContent = text;
      }

      if (!sameTarget) {
        target.appendChild(node);
      }

      break;
    }
    case "html": {
      element = element as JSXHTMLElement;
      const isDifferentElement = node != null && node.nodeName.toLowerCase() !== element.tag;

      if (isDifferentElement) {
        // remove previous
        const newElement = document.createElement(element.tag);
        node.parentNode?.replaceChild(newElement, node);
        node = newElement;
      }

      if (node == null) {
        // create new
        node = document.createElement(element.tag);
        target.appendChild(node);
      }

      if (element.props != null) {
        for (const prop of Object.keys(element.props)) {
          const last = rendering.previous?.element?.props?.[prop];
          const value = element.props[prop];
          const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in node;

          if (isEvent) {
            const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
            node.removeEventListener(eventName, last as EventListenerOrEventListenerObject);
            node.addEventListener(eventName, value as EventListenerOrEventListenerObject);
          } else {
            (node as HTMLElement).setAttribute(prop, value as string);
          }
        }
      }

      const htmlChildren = element.children?.filter((child) => typeof child !== "boolean")?.flat() ?? [];
      for (const [i, child] of htmlChildren?.entries()) {
        const rendered = render(node, child, {
          app: rendering.app,
          parent: rendering,
          previous: rendering.previous?.children[i],
        });
        children.push(rendered);
      }
      break;
    }
    case "function": {
      element = element as JSXFunctionElement;
      element.props = element.props ?? {};
      element.props.children = element.children;
      rendering.state = rendering.previous?.state ?? [];
      rendering.stateIndex = 0;
      const jsx = element.tag(element.props);
      if (jsx.tag === Fragment) {
        const fragmentChildren = jsx.children?.filter((child) => typeof child !== "boolean")?.flat() ?? [];
        for (const [i, child] of fragmentChildren?.entries()) {
          const rendered = render(target, child, {
            app: rendering.app,
            parent: rendering,
            previous: rendering.previous?.children[i],
          });
          children.push(rendered);
        }
      } else {
        const rendered = render(target, jsx, {
          app: rendering.app,
          parent: rendering,
          previous: rendering.previous?.children[0],
        });
        children.push(rendered);
      }

      break;
    }
  }
  rendering.tag = tag;
  rendering.type = type;
  rendering.element = element;
  rendering.target = target;
  rendering.node = node;
  rendering.children = children;

  return rendering;
}

export function useState<T>(initialValue: T) {
  const app = getCurrentApp();
  const rendering = app.getCurrent();
  if (rendering == null) {
    throw Error("What the heck am I supposed to do now????");
  }

  let index = rendering.stateIndex;
  let state = rendering.state[index];
  if (state == null) {
    state = rendering.state[index] = initialValue;
  }

  const set = (value: T) => {
    rendering.state[index] = value;
    app.update(rendering);
  };

  // bump state index
  rendering.stateIndex++;

  return [state, set] as [T, (value: T) => void];
}

export function jsx(tag: JSX.Element["tag"], props?: Record<string, unknown>, ...children: Children[]) {
  return {
    tag,
    props,
    children,
  };
}

export function Fragment(props: any) {
  return props.children;
}

type JSXElement<T = any> =
  | Partial<T>
  | {
      children: (string | number | HTMLElement)[];
    }
  | {
      [K in keyof any as K extends string ? `on${K}` : never]: any[K];
    };
type JSXFunction = (props?: { [key: string]: unknown; children?: RenderableItems }) => JSX.Element;
type JSXFunctionElement = {
  tag: JSXFunction;
  props: Record<string, unknown>;
  children?: Children[];
};
type JSXHTMLElement = {
  tag: string;
  props: Record<string, unknown>;
  children?: Children[];
};
declare global {
  namespace JSX {
    // React types:
    // type ElementType = React.JSX.ElementType;
    type PropsWithChildren<P = unknown> = P & { children?: RenderableItems | undefined };

    type Element = JSXFunctionElement | JSXHTMLElement;

    // interface ElementClass extends React.JSX.ElementClass {}
    // interface ElementAttributesProperty extends React.JSX.ElementAttributesProperty {}
    // interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute {}
    // type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
    // interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
    // interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}

    interface IntrinsicElements {
      [key: string]: JSXElement<any>; // TODO: update element
      // HTML
      // a: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;
      // abbr: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // address: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // area: React.DetailedHTMLProps<React.AreaHTMLAttributes<HTMLAreaElement>, HTMLAreaElement>;
      // article: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // aside: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // audio: React.DetailedHTMLProps<React.AudioHTMLAttributes<HTMLAudioElement>, HTMLAudioElement>;
      // b: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // base: React.DetailedHTMLProps<React.BaseHTMLAttributes<HTMLBaseElement>, HTMLBaseElement>;
      // bdi: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // bdo: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // big: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // blockquote: React.DetailedHTMLProps<React.BlockquoteHTMLAttributes<HTMLElement>, HTMLElement>;
      // body: React.DetailedHTMLProps<React.HTMLAttributes<HTMLBodyElement>, HTMLBodyElement>;
      // br: React.DetailedHTMLProps<React.HTMLAttributes<HTMLBRElement>, HTMLBRElement>;
      button: JSXElement<HTMLButtonElement>;
      // canvas: React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement>;
      // caption: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // cite: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // code: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // col: React.DetailedHTMLProps<React.ColHTMLAttributes<HTMLTableColElement>, HTMLTableColElement>;
      // colgroup: React.DetailedHTMLProps<React.ColgroupHTMLAttributes<HTMLTableColElement>, HTMLTableColElement>;
      // data: React.DetailedHTMLProps<React.DataHTMLAttributes<HTMLDataElement>, HTMLDataElement>;
      // datalist: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDataListElement>, HTMLDataListElement>;
      // dd: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // del: React.DetailedHTMLProps<React.DelHTMLAttributes<HTMLElement>, HTMLElement>;
      // details: React.DetailedHTMLProps<React.DetailsHTMLAttributes<HTMLElement>, HTMLElement>;
      // dfn: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // dialog: React.DetailedHTMLProps<React.DialogHTMLAttributes<HTMLDialogElement>, HTMLDialogElement>;
      // div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      // dl: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDListElement>, HTMLDListElement>;
      // dt: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      em: JSXElement<HTMLElement>;
      // embed: React.DetailedHTMLProps<React.EmbedHTMLAttributes<HTMLEmbedElement>, HTMLEmbedElement>;
      // fieldset: React.DetailedHTMLProps<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, HTMLFieldSetElement>;
      // figcaption: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // figure: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // footer: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // form: React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>;
      h1: JSXElement<HTMLHeadingElement>;
      h2: JSXElement<HTMLHeadingElement>;
      // h3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      // h4: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      // h5: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      // h6: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      // head: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadElement>, HTMLHeadElement>;
      // header: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // hgroup: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // hr: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHRElement>, HTMLHRElement>;
      // html: React.DetailedHTMLProps<React.HtmlHTMLAttributes<HTMLHtmlElement>, HTMLHtmlElement>;
      // i: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // iframe: React.DetailedHTMLProps<React.IframeHTMLAttributes<HTMLIFrameElement>, HTMLIFrameElement>;
      // img: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>;
      // input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
      // ins: React.DetailedHTMLProps<React.InsHTMLAttributes<HTMLModElement>, HTMLModElement>;
      // kbd: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // keygen: React.DetailedHTMLProps<React.KeygenHTMLAttributes<HTMLElement>, HTMLElement>;
      // label: React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
      // legend: React.DetailedHTMLProps<React.HTMLAttributes<HTMLLegendElement>, HTMLLegendElement>;
      // li: React.DetailedHTMLProps<React.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>;
      // link: React.DetailedHTMLProps<React.LinkHTMLAttributes<HTMLLinkElement>, HTMLLinkElement>;
      // main: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // map: React.DetailedHTMLProps<React.MapHTMLAttributes<HTMLMapElement>, HTMLMapElement>;
      // mark: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // menu: React.DetailedHTMLProps<React.MenuHTMLAttributes<HTMLElement>, HTMLElement>;
      // menuitem: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // meta: React.DetailedHTMLProps<React.MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>;
      // meter: React.DetailedHTMLProps<React.MeterHTMLAttributes<HTMLElement>, HTMLElement>;
      // nav: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // noindex: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // noscript: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // object: React.DetailedHTMLProps<React.ObjectHTMLAttributes<HTMLObjectElement>, HTMLObjectElement>;
      // ol: React.DetailedHTMLProps<React.OlHTMLAttributes<HTMLOListElement>, HTMLOListElement>;
      // optgroup: React.DetailedHTMLProps<React.OptgroupHTMLAttributes<HTMLOptGroupElement>, HTMLOptGroupElement>;
      // option: React.DetailedHTMLProps<React.OptionHTMLAttributes<HTMLOptionElement>, HTMLOptionElement>;
      // output: React.DetailedHTMLProps<React.OutputHTMLAttributes<HTMLElement>, HTMLElement>;
      // p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
      // param: React.DetailedHTMLProps<React.ParamHTMLAttributes<HTMLParamElement>, HTMLParamElement>;
      // picture: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // pre: React.DetailedHTMLProps<React.HTMLAttributes<HTMLPreElement>, HTMLPreElement>;
      // progress: React.DetailedHTMLProps<React.ProgressHTMLAttributes<HTMLProgressElement>, HTMLProgressElement>;
      // q: React.DetailedHTMLProps<React.QuoteHTMLAttributes<HTMLQuoteElement>, HTMLQuoteElement>;
      // rp: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // rt: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // ruby: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // s: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // samp: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // slot: React.DetailedHTMLProps<React.SlotHTMLAttributes<HTMLSlotElement>, HTMLSlotElement>;
      // script: React.DetailedHTMLProps<React.ScriptHTMLAttributes<HTMLScriptElement>, HTMLScriptElement>;
      // section: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // select: React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;
      // small: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // source: React.DetailedHTMLProps<React.SourceHTMLAttributes<HTMLSourceElement>, HTMLSourceElement>;
      // span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
      // strong: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // style: React.DetailedHTMLProps<React.StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>;
      // sub: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // summary: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // sup: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // table: React.DetailedHTMLProps<React.TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>;
      // template: React.DetailedHTMLProps<React.HTMLAttributes<HTMLTemplateElement>, HTMLTemplateElement>;
      // tbody: React.DetailedHTMLProps<React.HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>;
      // td: React.DetailedHTMLProps<React.TdHTMLAttributes<HTMLTableDataCellElement>, HTMLTableDataCellElement>;
      // textarea: React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>;
      // tfoot: React.DetailedHTMLProps<React.HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>;
      // th: React.DetailedHTMLProps<React.ThHTMLAttributes<HTMLTableHeaderCellElement>, HTMLTableHeaderCellElement>;
      // thead: React.DetailedHTMLProps<React.HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>;
      // time: React.DetailedHTMLProps<React.TimeHTMLAttributes<HTMLElement>, HTMLElement>;
      // title: React.DetailedHTMLProps<React.HTMLAttributes<HTMLTitleElement>, HTMLTitleElement>;
      // tr: React.DetailedHTMLProps<React.HTMLAttributes<HTMLTableRowElement>, HTMLTableRowElement>;
      // track: React.DetailedHTMLProps<React.TrackHTMLAttributes<HTMLTrackElement>, HTMLTrackElement>;
      // u: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // ul: React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement>;
      // var: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // video: React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>;
      // wbr: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      // webview: React.DetailedHTMLProps<React.WebViewHTMLAttributes<HTMLWebViewElement>, HTMLWebViewElement>;

      // // SVG
      // svg: React.SVGProps<SVGSVGElement>;

      // animate: React.SVGProps<SVGElement>; // TODO: It is SVGAnimateElement but is not in TypeScript's lib.dom.d.ts for now.
      // animateMotion: React.SVGProps<SVGElement>;
      // animateTransform: React.SVGProps<SVGElement>; // TODO: It is SVGAnimateTransformElement but is not in TypeScript's lib.dom.d.ts for now.
      // circle: React.SVGProps<SVGCircleElement>;
      // clipPath: React.SVGProps<SVGClipPathElement>;
      // defs: React.SVGProps<SVGDefsElement>;
      // desc: React.SVGProps<SVGDescElement>;
      // ellipse: React.SVGProps<SVGEllipseElement>;
      // feBlend: React.SVGProps<SVGFEBlendElement>;
      // feColorMatrix: React.SVGProps<SVGFEColorMatrixElement>;
      // feComponentTransfer: React.SVGProps<SVGFEComponentTransferElement>;
      // feComposite: React.SVGProps<SVGFECompositeElement>;
      // feConvolveMatrix: React.SVGProps<SVGFEConvolveMatrixElement>;
      // feDiffuseLighting: React.SVGProps<SVGFEDiffuseLightingElement>;
      // feDisplacementMap: React.SVGProps<SVGFEDisplacementMapElement>;
      // feDistantLight: React.SVGProps<SVGFEDistantLightElement>;
      // feDropShadow: React.SVGProps<SVGFEDropShadowElement>;
      // feFlood: React.SVGProps<SVGFEFloodElement>;
      // feFuncA: React.SVGProps<SVGFEFuncAElement>;
      // feFuncB: React.SVGProps<SVGFEFuncBElement>;
      // feFuncG: React.SVGProps<SVGFEFuncGElement>;
      // feFuncR: React.SVGProps<SVGFEFuncRElement>;
      // feGaussianBlur: React.SVGProps<SVGFEGaussianBlurElement>;
      // feImage: React.SVGProps<SVGFEImageElement>;
      // feMerge: React.SVGProps<SVGFEMergeElement>;
      // feMergeNode: React.SVGProps<SVGFEMergeNodeElement>;
      // feMorphology: React.SVGProps<SVGFEMorphologyElement>;
      // feOffset: React.SVGProps<SVGFEOffsetElement>;
      // fePointLight: React.SVGProps<SVGFEPointLightElement>;
      // feSpecularLighting: React.SVGProps<SVGFESpecularLightingElement>;
      // feSpotLight: React.SVGProps<SVGFESpotLightElement>;
      // feTile: React.SVGProps<SVGFETileElement>;
      // feTurbulence: React.SVGProps<SVGFETurbulenceElement>;
      // filter: React.SVGProps<SVGFilterElement>;
      // foreignObject: React.SVGProps<SVGForeignObjectElement>;
      // g: React.SVGProps<SVGGElement>;
      // image: React.SVGProps<SVGImageElement>;
      // line: React.SVGProps<SVGLineElement>;
      // linearGradient: React.SVGProps<SVGLinearGradientElement>;
      // marker: React.SVGProps<SVGMarkerElement>;
      // mask: React.SVGProps<SVGMaskElement>;
      // metadata: React.SVGProps<SVGMetadataElement>;
      // mpath: React.SVGProps<SVGElement>;
      // path: React.SVGProps<SVGPathElement>;
      // pattern: React.SVGProps<SVGPatternElement>;
      // polygon: React.SVGProps<SVGPolygonElement>;
      // polyline: React.SVGProps<SVGPolylineElement>;
      // radialGradient: React.SVGProps<SVGRadialGradientElement>;
      // rect: React.SVGProps<SVGRectElement>;
      // stop: React.SVGProps<SVGStopElement>;
      // switch: React.SVGProps<SVGSwitchElement>;
      // symbol: React.SVGProps<SVGSymbolElement>;
      // text: React.SVGProps<SVGTextElement>;
      // textPath: React.SVGProps<SVGTextPathElement>;
      // tspan: React.SVGProps<SVGTSpanElement>;
      // use: React.SVGProps<SVGUseElement>;
      // view: React.SVGProps<SVGViewElement>;
    }
  }
}
