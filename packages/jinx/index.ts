let CURRENT_COMPONENT: JINX | undefined;

function renderChildNode(child: string | number | boolean | Node): Node {
  if (typeof child === "string" || typeof child === "number") {
    return document.createTextNode(child.toString());
  } else if (typeof child === "boolean") {
    return document.createDocumentFragment();
  } else {
    return child;
  }
}

function renderChildren(children: JSX.Child[]): Node[] {
  let rendered = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      rendered.push(...renderChildren(child));
    } else {
      rendered.push(renderChildNode(child));
    }
  }
  return rendered;
}

function renderComponent(tag: JSX.Function, props: JSX.Props, ref?: JINX) {
  const component: JINX = ref ?? {
    props,
    state: {
      index: 0,
      values: [],
    },
    tag,
  };

  component.state.index = 0;
  CURRENT_COMPONENT = component;
  component.rendered = tag(component.props);
  CURRENT_COMPONENT = undefined;

  return component;
}

export function jsx(tag: string, props: JSX.Props, ...children: JSX.Child[]): HTMLElement;
export function jsx(tag: JSX.Function, props: JSX.Props, ...children: JSX.Child[]): DocumentFragment;
export function jsx(tag: string | JSX.Function, props: JSX.Props, ...children: JSX.Child[]) {
  const renderedChildren = renderChildren(children);

  let container: DocumentFragment | HTMLElement;
  if (typeof tag === "function") {
    container = document.createDocumentFragment();
    const component = renderComponent(tag, { ...props, children });
    const componentRendered = component.rendered!;
    if (Array.isArray(componentRendered)) {
      //
    } else if (typeof componentRendered === "string" || typeof componentRendered === "number") {
      const node = document.createTextNode(componentRendered.toString());
      renderedChildren.push(node);
    } else if (typeof componentRendered === "boolean") {
      // renderedChildren.push(component);
    } else if (componentRendered instanceof DocumentFragment) {
      component.nodes = Array.from(componentRendered.childNodes);
      renderedChildren.push(...componentRendered.childNodes);
    } else {
      renderedChildren.push(componentRendered);
    }
  } else {
    container = document.createElement(tag);
    const currentProps = props ?? {};
    for (const [prop, value] of Object.entries(currentProps)) {
      const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in container;
      if (isEvent) {
        const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
        container.addEventListener(eventName, value as EventListenerOrEventListenerObject);
      } else if (prop === "style" && value != null && typeof value === "object") {
        for (const [styleProp, styleValue] of Object.entries(value)) {
          container.style[styleProp as any] = styleValue;
          //                    ^ dirty, but I ain't figuring out how to type this
        }
      } else {
        container.setAttribute(prop, value as string);
      }
    }
  }

  for (const child of renderedChildren) {
    container.appendChild(child);
  }

  return container as HTMLElement | DocumentFragment;
}

export function Fragment(props: Record<string, unknown> & { children: JSX.Child }) {
  return props.children;
}

export function useState<T>(initialValue: T extends Function ? never : T) {
  const jinx = CURRENT_COMPONENT;
  if (jinx == null) {
    throw Error("What the heck am I supposed to do now????");
  }

  let index = jinx.state.index;
  let currentValue = jinx.state.values[index];
  if (currentValue == null) {
    currentValue = jinx.state.values[index] = initialValue;
  }

  const set = (value: T extends Function ? (prev: T) => T : T) => {
    jinx.state.values[index] = typeof value === "function" ? value(currentValue) : value;

    const component = renderComponent(jinx.tag, jinx.props, jinx);
    const componentRendered = component.rendered!;
    if (componentRendered instanceof DocumentFragment) {
      const nodes = Array.from(componentRendered.childNodes);
      const total = Math.max(jinx.nodes?.length ?? 0, componentRendered.childNodes.length);
      for (let i = 0; i < total; i++) {
        const previous = jinx.nodes?.[i];
        const next = nodes[i];

        if (previous && next) {
          previous.parentNode?.replaceChild(next, previous);
        } else if (previous && !next) {
          previous.parentNode?.removeChild(previous);
        } else if (!previous && next) {
          // TODO
          // container.appendChild(next);
        }
      }
      jinx.nodes = nodes;
    } else {
      // TODO
    }
  };

  jinx.state.index++;
  return [currentValue, set] as [T, (value: T | ((prev: T) => T)) => void];
}

// damn this is an amazing hack
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type IntrinsicHTMLElement<T extends keyof HTMLElementTagNameMap> = Prettify<
  Partial<Omit<HTMLElementTagNameMap[T], "style" | "class">> & {
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

declare global {
  namespace JSX {
    type IntrinsicElements = {
      [key in keyof HTMLElementTagNameMap]: IntrinsicHTMLElement<key>;
    } & {
      [key: string]: any;
    };

    type Child = string | number | boolean | HTMLElement | DocumentFragment | Child[];

    interface ElementChildrenAttribute {
      children: {};
    }

    type Element = string | HTMLElement | DocumentFragment;

    type ElementType = keyof IntrinsicElements | Function;

    type Function<T = any> = (props: { children?: Child[] } & T) => Child;

    type Props = Record<string, unknown> & { children: JSX.Child[] };
  }

  type JINX = {
    props: Record<string, unknown> & { children: JSX.Child[] };
    tag: JSX.Function;
    target?: Node;
    state: {
      index: number;
      values: unknown[];
    };
    nodes?: Node[];
    rendered?: ReturnType<JSX.Function>;
  } & Record<string, any>;
}
