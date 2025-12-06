let CURRENT_JINX: JINX | undefined;

function renderChildNode(child: string | number | boolean | Node): Node {
  let node: Node;
  if (typeof child === "string" || typeof child === "number") {
    node = document.createTextNode(child.toString());
  } else if (typeof child === "boolean") {
    node = document.createDocumentFragment();
  } else {
    node = child;
  }

  return node;
}

type NodeArray = (Node | NodeArray)[];
function renderChildren(children: JSX.Child[]): NodeArray {
  let rendered = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      rendered.push(renderChildren(child));
    } else {
      rendered.push(renderChildNode(child));
    }
  }

  return rendered;
}

function renderComponent(tag: JSX.Function, props: JSX.Props, values: unknown[]): JINX {
  const component: JINX = {
    props,
    state: {
      index: 0,
      values: values ?? [],
    },
    tag,
  };

  component.state.index = 0;
  CURRENT_JINX = component;
  component.rendered = tag(component.props);
  CURRENT_JINX = undefined;

  component.container = document.createDocumentFragment();
  const componentRendered = component.rendered!;
  component.nodes = [];
  if (typeof componentRendered === "string" || typeof componentRendered === "number") {
    const node = document.createTextNode(componentRendered.toString());
    component.nodes.push(node);
    component.container.appendChild(node);
  } else if (typeof componentRendered === "boolean") {
    // noop
  } else if (Array.isArray(componentRendered)) {
    appendChildren(renderChildren(componentRendered), component.container);
  } else if (componentRendered instanceof DocumentFragment) {
    component.nodes.push(...Array.from(componentRendered.childNodes));
    component.container.appendChild(componentRendered);
  } else {
    component.nodes.push(componentRendered);
    component.container.appendChild(componentRendered);
  }

  return component;
}

function appendChildren(children: NodeArray, target: Node) {
  for (const child of children) {
    if (Array.isArray(child)) {
      appendChildren(child, target);
    } else {
      target.appendChild(child);
    }
  }
}

let isMeasuring = false;
export function jsx(tag: string, props: JSX.Props, ...children: JSX.Child[]): HTMLElement;
export function jsx(tag: JSX.Function, props: JSX.Props, ...children: JSX.Child[]): DocumentFragment;
export function jsx(tag: string | JSX.Function, props: JSX.Props, ...children: JSX.Child[]) {
  let container: Node;
  if (typeof tag === "function") {
    const component = renderComponent(tag, { ...props, children }, []);
    container = component.container!;
  } else {
    const element = document.createElement(tag);
    const currentProps = props ?? {};
    for (const [prop, value] of Object.entries(currentProps)) {
      const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in element;
      if (isEvent) {
        const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
        element.addEventListener(eventName, value as EventListenerOrEventListenerObject);
      } else if (prop === "style" && value != null && typeof value === "object") {
        for (const [styleProp, styleValue] of Object.entries(value)) {
          element.style[styleProp as any] = styleValue;
          //                    ^ dirty, but I ain't figuring out how to type this
        }
      } else {
        element.setAttribute(prop, value as string);
      }
    }

    appendChildren(renderChildren(children), element);
    container = element;
  }
  return container as HTMLElement | DocumentFragment;
}

export function Fragment(props: Record<string, unknown> & { children: JSX.Child }) {
  return props.children;
}

export function useState<T>(initialValue: T extends Function ? never : T) {
  const jinx = CURRENT_JINX;
  if (jinx == null) {
    throw Error("useState: Unknown component to update.");
  }

  let index = jinx.state.index;
  let currentValue = jinx.state.values[index];
  if (currentValue == null) {
    currentValue = jinx.state.values[index] = initialValue;
  }

  const set = (value: T extends Function ? (prev: T) => T : T) => {
    const t0 = performance.now();

    const values = [...jinx.state.values];
    values[index] = typeof value === "function" ? value(currentValue) : value;

    const component = renderComponent(jinx.tag, jinx.props, values);
    const total = Math.max(jinx.nodes!.length, component.nodes!.length);
    for (let i = 0; i < total; i++) {
      const prevNode = jinx.nodes![i];
      const nextNode = component.nodes![i];
      if (prevNode != null && nextNode != null) {
        prevNode.parentNode?.replaceChild(nextNode, prevNode);
      } else {
        console.log("hmm", prevNode, nextNode);
      }
    }

    const t1 = performance.now();
    console.log(`useState update: ${(t1 - t0).toFixed()}ms`);
  };

  jinx.state.index++;
  return [currentValue, set] as [T, (value: T | ((prev: T) => T)) => void];
}

export function useReducer<T>(reducer: (state: T, action: { type: string }) => T, initialValue: T) {
  const jinx = CURRENT_JINX;
  if (jinx == null) {
    throw Error("useReducer: Unknown component to update.");
  }

  let index = jinx.state.index;
  let currentValue = jinx.state.values[index] as T;
  if (currentValue == null) {
    currentValue = jinx.state.values[index] = initialValue;
  }

  const dispatch = (action: { type: string }) => {
    const t0 = performance.now();
    const values = [...jinx.state.values];
    values[index] = reducer(currentValue, action);

    const component = renderComponent(jinx.tag, jinx.props, values);
    const total = Math.max(jinx.nodes!.length, component.nodes!.length);
    for (let i = 0; i < total; i++) {
      const prevNode = jinx.nodes![i];
      const nextNode = component.nodes![i];
      if (prevNode != null && nextNode != null) {
        prevNode.parentNode?.replaceChild(nextNode, prevNode);
      } else {
        console.log("hmm", prevNode, nextNode);
      }
    }

    const t1 = performance.now();
    console.log(`useReducer update: ${(t1 - t0).toFixed()}ms`);
  };

  jinx.state.index++;
  return [currentValue, dispatch] as [T, typeof dispatch];
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

    type Function<T = any> = (props: Props & T) => Child;

    type Props = Record<string, unknown> & { children?: Child[] };
  }

  type JINX = {
    props: JSX.Props;
    tag: JSX.Function;
    state: {
      index: number;
      values: unknown[];
    };
    container?: Node;
    nodes?: Node[];
    rendered?: ReturnType<JSX.Function>;
  } & Record<string, any>;
}
