function renderNode(child: string | number | boolean | Node) {
  let node: Node | null;
  if (typeof child === "boolean") {
    node = null;
  } else if (typeof child === "string" || typeof child === "number") {
    node = document.createTextNode(child.toString());
  } else {
    node = child;
  }

  return node;
}

function renderChildrenToNodes(children: JSX.Children) {
  const nodes: Node[] = [];
  if (Array.isArray(children)) {
    for (const child of children) {
      const innerChildren = renderChildrenToNodes(child);
      nodes.push(...innerChildren);
    }
  } else if (children instanceof DocumentFragment) {
    const childNodes = Array.from(children.childNodes);
    nodes.push(...childNodes);
  } else if (children instanceof Node) {
    nodes.push(children);
  } else {
    const node = renderNode(children);
    if (node) {
      nodes.push(node);
    }
  }

  return nodes;
}

let CURRENT_JINX: JINX | undefined;
function renderComponent(tag: JSX.Function, props: JSX.Props, values: unknown[]) {
  const component = {
    props,
    state: {
      index: 0,
      values: values ?? [],
    },
    tag,
  } as JINX;

  CURRENT_JINX = component;
  component.state.index = 0;
  component.htmlOutput = tag(component.props) as JINX["htmlOutput"];

  if (Array.isArray(component.htmlOutput)) {
    const fragment = document.createDocumentFragment();
    const nodes = renderChildrenToNodes(component.htmlOutput);
    for (const node of nodes) {
      fragment.appendChild(node);
    }
    component.nodes = Array.from(component.htmlOutput);
    component.htmlOutput = fragment;
  } else if (component.htmlOutput instanceof DocumentFragment) {
    component.nodes = Array.from(component.htmlOutput.childNodes);
  } else {
    component.nodes = [component.htmlOutput];
  }

  return component;
}

export function jsx(tag: string | JSX.Function, props: JSX.Props, ...children: JSX.Children[]) {
  const nodes = renderChildrenToNodes(children);
  if (typeof tag === "function") {
    const jinxProps = { ...props, children: nodes };
    const component = renderComponent(tag, jinxProps, []);
    return component.htmlOutput;
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

    for (const node of nodes) {
      element.appendChild(node);
    }

    return element;
  }
}

export function Fragment(props: { children: JSX.Children }) {
  return props.children;
}

function diffComponents(previous: JINX, next: JINX) {
  const total = Math.max(previous.nodes!.length, next.nodes!.length);
  for (let i = 0; i < total; i++) {
    const prevNode = previous.nodes![i];
    const nextNode = next.nodes![i];
    if (prevNode != null && nextNode != null) {
      prevNode.parentNode?.replaceChild(nextNode, prevNode);
    } else {
      // TODO: this branch never hit so far...
      console.warn("node is empty? prev/next: ", prevNode, nextNode);
    }
  }
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
    diffComponents(jinx, component);

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
    diffComponents(jinx, component);

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

    type Children = string | number | boolean | Node | Children[];

    type RenderedChildren = Node[];

    interface ElementChildrenAttribute {
      children: {};
    }

    type Element = string | HTMLElement | DocumentFragment;

    type ElementType = keyof IntrinsicElements | Function;

    type Function<T = any> = (props: Props & T) => Children;

    type Props = Record<string, unknown>;

    type ChildrenProps = { children: Children };
  }

  type JINX = {
    props: JSX.Props;
    tag: JSX.Function;
    state: {
      index: number;
      values: unknown[];
    };
    nodes: Node[];
    htmlOutput: Node;
  };
}
