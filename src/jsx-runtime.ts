const instances: Jinx[] = [];
let currentApp: Jinx | undefined;

function getCurrentApp() {
  return currentApp!;
}

export function createRoot(target: HTMLElement | null) {
  if (!target) {
    throw Error("No target specified.");
  }

  const jinx: Jinx = {
    index: instances.length,
    target,
    frames: [],
    render: (element: Renderable | Renderable[]) => {
      currentApp = jinx;
      const rendering: RenderContext = {
        jinx,
        element,
        dom: [],
        target,
        stateIndex: 0,
        state: [],
      };
      const t0 = performance.now();
      const rendered = render(element, rendering);

      for (const output of rendered.dom ?? []) {
        target.append(output);
      }

      const t1 = performance.now();
      console.log(`render: ${t1 - t0} ms`);
      jinx.frames.push(rendered);
      return rendered;
    },
    update: (element, previous) => {
      const t0 = performance.now();

      currentApp = jinx;
      const rendering: RenderContext = {
        jinx,
        dom: [],
        previous,
        target: previous.target,
        stateIndex: 0,
        state: [],
      };
      const rendered = render(element, rendering);

      jinx.frames.push(rendered);
      const t1 = performance.now();
      console.log(`update: ${t1 - t0} ms`);
      return rendered;
    },
    setCurrent(rendering: RenderContext) {
      jinx._inProgress = rendering;
    },
    getCurrent() {
      return jinx._inProgress;
    },
  };
  instances.push(jinx);
  return jinx;
}

function render(element: Renderable | Renderable[], context: RenderContext) {
  let { jinx, target, previous } = context;

  let dom: RenderContext["dom"] = [];
  let rendered: RenderContext["rendered"] = [];
  let _type: RenderContext["_type"];
  let _tag: RenderContext["_tag"];
  let _children;
  if (Array.isArray(element)) {
    _type = "children";
    _tag = `[]:${element.length.toString()}`;
  } else if (typeof element === "boolean") {
    _type = "boolean";
    _tag = element.toString();
  } else if (typeof element === "string" || typeof element === "number") {
    _type = "text";
    _tag = element.toString();
  } else if (typeof element.tag === "string") {
    _type = "html";
    _tag = element.tag;
    _children = element.children;
  } else if (typeof element.tag === "function") {
    _type = "function";
    _tag = element.tag.name;
    _children = element.children;
  }

  context._type = _type;
  context._tag = _tag;
  context.dom = dom;
  context.rendered = rendered;
  context.element = element;

  jinx.setCurrent(context);

  // children
  if (Array.isArray(element)) {
    const _children = element.filter((element) => typeof element !== "boolean").flat();
    for (const [i, child] of _children?.entries()) {
      const _rendered = render(child, {
        jinx,
        dom: [],
        parent: context,
        target,
        previous: previous?.rendered?.[i],
        stateIndex: 0,
        state: [],
      });
      dom.push(...(_rendered.dom ?? []));
      rendered.push(_rendered);
    }

    // remove or reattach previous children
    if (previous != null && previous.dom) {
      const cull = previous.dom.length - (previous.dom.length - dom.length);
      for (let i = cull; i < previous.dom.length; i++) {
        previous.dom[i].remove();
      }

      const attach = dom.length - (dom.length - previous.dom.length);
      for (let i = attach; i < dom.length; i++) {
        target.append(dom[i]);
      }
    }

    return context;
  }

  if (typeof element === "boolean") {
    // not rendered
    return context;
  }

  // text
  if (typeof element === "string" || typeof element === "number") {
    const text = element.toString();
    const previousNode = previous?.dom?.[0];
    const wasText = previousNode != null && previousNode.nodeName.toLowerCase() === "#text";

    let textNode;
    if (wasText) {
      textNode = previousNode as Text;
      textNode.textContent = text;
    } else if (previousNode != null && !wasText) {
      textNode = document.createTextNode(text);
      previousNode.replaceWith(textNode);
    } else {
      textNode = document.createTextNode(text);
    }
    dom.push(textNode);

    return context;
  }

  // html
  if (typeof element.tag === "string") {
    const previousDom = previous?.dom?.[0];
    let htmlElement: HTMLElement;

    const isDifferent = previousDom != null && previousDom.nodeName.toLowerCase() !== element.tag;

    if (isDifferent) {
      htmlElement = document.createElement(element.tag);
      previousDom.replaceWith(htmlElement);
    } else if (previousDom == null) {
      htmlElement = document.createElement(element.tag);
    } else {
      htmlElement = previousDom as HTMLElement;
    }

    dom.push(htmlElement);

    let previousProps: Record<string, unknown> | undefined;
    if (!Array.isArray(previous?.element) && typeof previous?.element === "object") {
      previousProps = previous.element.props;
      for (const [prop, value] of Object.entries(previous?.element.props ?? {})) {
        htmlElement.setAttribute(prop, "");
      }
    }

    const currentProps = element.props ?? {};
    for (const [prop, value] of Object.entries(currentProps)) {
      const last = previousProps?.[prop];
      const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in htmlElement;

      if (isEvent) {
        const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
        htmlElement.removeEventListener(eventName, last as EventListenerOrEventListenerObject);
        htmlElement.addEventListener(eventName, value as EventListenerOrEventListenerObject);
      } else if (prop === "style" && value != null && typeof value === "object") {
        for (const [styleProps, styleValue] of Object.entries(value)) {
          htmlElement.style.setProperty(styleProps, styleValue);
        }
      } else {
        htmlElement.setAttribute(prop, value as string);
      }
    }

    // render children
    if (element.children) {
      const _rendered = render(element.children.flat(), {
        jinx,
        parent: context,
        target,
        previous: previous?.rendered?.[0],
        stateIndex: 0,
        state: [],
      });
      rendered.push(_rendered);
      const _domNodes = rendered.map((render) => render.dom ?? []).flat() ?? [];
      htmlElement.append(..._domNodes);
    }

    return context;
  }

  // function
  if (typeof element.tag === "function") {
    context.state = previous?.state ?? [];
    context.stateIndex = 0;

    const props = {
      ...element.props,
      children: element.children,
    };
    const _element = element.tag(props);
    const _rendered = render(_element, {
      jinx,
      dom: [],
      parent: context,
      target,
      previous: previous?.rendered?.[0],
      stateIndex: 0,
      state: [],
    });
    rendered.push(_rendered);
    //
    const _domNodes = _rendered.dom ?? [];
    dom.push(..._domNodes);
    return context;
  }

  throw Error("what");
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
    app.update(rendering.element as JSX.Element, rendering);
  };

  rendering.stateIndex++;

  return [state, set] as [T, (value: T) => void];
}

export function useReducer<S, A>(reducer: (state: S, action: A) => S, initialValue: S) {
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

  const dispatch = (action: A) => {
    rendering.state[index] = reducer(state, action);
    app.update(rendering.element!, rendering);
  };

  // bump state index
  rendering.stateIndex++;

  return [state, dispatch] as [S, typeof dispatch];
}

export function jsx(tag: string | JSXFunction, props: any, ...children: Renderable[]): JSX.Element {
  return {
    tag,
    props: props ?? {},
    children,
  };
}

export function Fragment(props: any) {
  return props.children;
}

// damn this is an amazing hack
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type Jinx = {
  index: number;
  target: Element;
  _inProgress?: RenderContext;
  frames: RenderContext[];
  render: (element: Renderable | Renderable[]) => RenderContext;
  update: (element: Renderable | Renderable[], previous: RenderContext) => RenderContext;
  setCurrent: (frame: RenderContext) => void;
  getCurrent: () => RenderContext | undefined;
};

interface RenderContext<S = any> {
  _tag?: string;
  _type?: "children" | "boolean" | "text" | "html" | "function";
  jinx: Jinx;
  target: Element;
  element?: Renderable | Renderable[];
  dom?: (HTMLElement | Text)[];
  stateIndex: 0;
  state: S[];
  rendered?: RenderContext<S>[];
  previous?: RenderContext<S>;
  parent?: RenderContext<S>;
}

type Renderable = JSX.Element | string | number | boolean;

type JSXFunction = (props?: any & { children?: Renderable[] }) => JSX.Element;

type IntrinsicHTMLElementsMap = {
  [key in keyof HTMLElementTagNameMap]: Prettify<
    Partial<Omit<HTMLElementTagNameMap[key], "style" | "class">> & {
      // TODO: gotta be a better way to do these
      style?: Partial<CSSStyleDeclaration>;
      class?: string;
      children?: any;
    } & {
      // hot damn does this actually work?? onclick => onClick
      [K in keyof GlobalEventHandlers as K extends `on${infer E}`
        ? `on${Capitalize<E>}`
        : keyof GlobalEventHandlers]?: GlobalEventHandlers[K];
    }
  >;
};

declare global {
  namespace JSX {
    type Element = {
      tag: string | JSXFunction;
      props: any;
      children: Renderable[];
    };
    type ElementType = keyof IntrinsicElements | JSXFunction;

    interface ElementChildrenAttribute {
      children: {};
    }

    type IntrinsicElements = IntrinsicHTMLElementsMap;
  }
}
