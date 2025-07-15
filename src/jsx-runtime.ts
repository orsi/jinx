type Children = JSX.Element | string | number;
type AppRoot = {
  index: number;
  target: Element;
  lastFrame?: RenderFrame;
  frames: RenderFrame[];
  render: (element: RenderableItems) => RenderFrame;
  update: (newTarget: Element, element: RenderableItems, lastFrame: RenderFrame) => RenderFrame;
  setRenderingFrame: (frame: RenderFrame) => void;
  getRenderingFrame: () => RenderFrame | undefined;
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

const APPS: AppRoot[] = [];
let currentApp: AppRoot | undefined;

function getCurrentApp() {
  return currentApp!;
}

export function createRoot(target: Element) {
  let app: AppRoot = {
    index: APPS.length,
    target,
    frames: [],
    render: (element: RenderableItems) => {
      currentApp = app;
      const rendered = renderRoot(target, element);
      app.frames.push(rendered);
      return rendered;
    },
    update: (target: Element, element: RenderableItems, lastFrame: RenderFrame) => {
      currentApp = app;
      const rendered = renderRoot(target, element, undefined, lastFrame);
      app.frames.push(rendered);
      return rendered;
    },
    setRenderingFrame(frame: RenderFrame) {
      app.lastFrame = frame;
    },
    getRenderingFrame() {
      return app.lastFrame;
    },
  };
  APPS.push(app);
  return app;
}

function renderRoot(target: Element, element: RenderableItems, parent?: RenderFrame, previous?: RenderFrame) {
  const app = getCurrentApp();
  const frame: RenderFrame = {
    createdAt: Date.now(),
    frame: app.frames.length + 1,
    app,
    props: {
      target,
      element,
    },
    parent,
    previous,
    children: [],
  };
  app.setRenderingFrame(frame);

  if (Array.isArray(element)) {
    // children
    for (const [i, child] of element.entries()) {
      const rendered = renderRoot(target, child, frame, frame.previous?.children[i]);
      frame.children.push(rendered);
    }
  } else if (typeof element === "string" || typeof element === "number" || typeof element === "boolean") {
    // text
    const text = element.toString();
    frame.container = frame.previous?.container as Text;
    if (frame.container == null) {
      frame.container = document.createTextNode(text);
      target.appendChild(frame.container);
    } else if (target !== frame.previous?.props.target) {
      frame.container = document.createTextNode(text);
      target.appendChild(frame.container);
    } else if (text !== frame.container.textContent) {
      frame.container.textContent = text;
    }
  } else if (typeof element === "object" && typeof element.tag === "string") {
    // html
    frame.container = frame.previous?.container as HTMLElement;
    if (frame.container == null) {
      frame.container = document.createElement(element.tag);
      target.appendChild(frame.container);
    } else if ((element as JSX.Element).tag !== frame.container?.tagName?.toLowerCase()) {
      const newContainer = document.createElement(element.tag);
      frame.container.parentNode?.replaceChild(newContainer, frame.container);
      frame.container = newContainer;
    }

    if (element.props != null) {
      for (const prop of Object.keys(element.props)) {
        const value = element.props[prop];
        const last = (frame.previous?.props.element as JSXHTMLElement | undefined)?.props[prop];
        const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in frame.container;

        if (last === value) {
          // noop
        } else if (isEvent) {
          const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
          frame.container.removeEventListener(eventName, last as EventListenerOrEventListenerObject);
          frame.container.addEventListener(eventName, value as EventListenerOrEventListenerObject);
        } else {
          (frame.container as HTMLElement).setAttribute(prop, value as string);
        }
      }
    }

    // render children
    if (element.children != null) {
      for (const [i, child] of element.children.entries()) {
        const rendered = renderRoot((frame.container as Element) ?? target, child, frame, frame.previous?.children[i]);
        frame.children.push(rendered);
      }
    }
  } else if (typeof element === "object" && element.tag === Fragment) {
    // fragment
    const rendered = renderRoot(target, element.children ?? [], frame, frame.previous?.children[0]);
    frame.children.push(rendered);
  } else if (typeof element === "object" && typeof element.tag === "function") {
    // component
    frame.states = frame.previous?.states;
    if (frame.states == null) {
      frame.states = {
        index: 0,
        values: [],
      };
    }
    frame.states.index = 0;

    frame.container = element.tag({
      ...element.props,
      children: element.children,
    });

    const rendered = renderRoot(target, frame.container, frame, frame.previous?.children[0]);
    frame.children.push(rendered);
  } else {
    throw Error("unknown");
  }

  return frame;
}

export function useState<T>(initialValue: T) {
  const app = getCurrentApp();
  const context = app.getRenderingFrame();
  if (context == null || context.props.element == null || context.states == null) {
    throw Error("What the heck am I supposed to do now????");
  }

  const { index, values } = context.states;
  let value = values[index];
  if (value == null) {
    value = values[index] = initialValue;
  }

  const set = (value: T) => {
    values[index] = value;
    app.update(context.props.target, context.props.element, context);
  };

  // bump state index
  context.states.index++;

  return [values[index], set] as [T, (value: T) => void];
}

export function jsx(tag: JSX.Element["tag"], props?: Record<string, unknown>, ...children: Children[]) {
  return {
    tag,
    props,
    children,
  };
}

export function Fragment() {}

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
