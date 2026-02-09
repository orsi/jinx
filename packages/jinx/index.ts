let CURRENT_COMPONENT: JSX.ComponentRef | undefined;

export function jsx(tag: string | JSX.ComponentFunction, props: JSX.Props, ...children: JSX.Child[]): Node {
  let node: Node;
  if (typeof tag === "function") {
    node = renderComponent(tag, { ...props, children }, []);
  } else {
    node = document.createElement(tag);
    node.__children = children;
    node.__childNodes = [];
    for (const child of children) {
      const childNode = renderChild(child);
      node.__childNodes.push(childNode);
    }
  }

  // prepare for insertion in dom if not being rendered inside a component
  if (!CURRENT_COMPONENT) {
    prepare(node);
  }

  return node;
}

export function Fragment(props: JSX.PropsWithChildren) {
  return props.children;
}

function renderComponent(tag: JSX.ComponentFunction, props: JSX.ComponentProps, values: unknown[]) {
  const component: JSX.ComponentRef = {
    props,
    statePosition: 0,
    state: values ?? [],
    tag,
  };

  const currentContext = CURRENT_COMPONENT;
  CURRENT_COMPONENT = component;
  const result = tag(props);
  const node = renderChild(result);
  component.node = node;
  CURRENT_COMPONENT = currentContext;

  return node;
}

function renderChild(child: JSX.Child) {
  if (child instanceof Node) {
    return child;
  } else if (!child || (Array.isArray(child) && child.length === 0)) {
    return document.createComment("");
  } else if (typeof child === "boolean") {
    return document.createComment(`${child}`);
  } else if (typeof child === "string" || typeof child === "number") {
    const text = child.toString();
    const node = document.createTextNode(text);
    return node;
  } else {
    const node = document.createDocumentFragment();
    node.__children = child;
    node.__childNodes = [];
    for (const subChild of child) {
      const subNode = renderChild(subChild);
      node.__childNodes.push(subNode);
    }
    return node;
  }
}

function setProps(target: Node, props?: JSX.Props, previousProps?: JSX.Props) {
  if (!(target instanceof HTMLElement)) {
    return;
  }

  // remove last
  for (const [prop, value] of Object.entries(previousProps ?? {})) {
    const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in target;
    if (isEvent) {
      const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
      target.removeEventListener(eventName, value as EventListenerOrEventListenerObject);
    } else if (prop === "style" && value != null && typeof value === "object") {
      for (const [styleProp] of Object.entries(value)) {
        target.style.removeProperty(styleProp);
      }
    } else {
      target.removeAttribute(prop);
    }
  }

  // set new
  for (const [prop, value] of Object.entries(props ?? {})) {
    const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in target;
    if (isEvent) {
      const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
      target.addEventListener(eventName, value as EventListenerOrEventListenerObject);
    } else if (prop === "style" && value != null && typeof value === "object") {
      for (const [styleProp, styleValue] of Object.entries(value)) {
        target.style[styleProp as any] = styleValue;
        //                    ^ dirty, but I ain't figuring out how to type this
      }
    } else {
      target.setAttribute(prop, value as string);
    }
  }

  target.__props = props;
}

function prepare(node: Node) {
  for (const child of node.__childNodes ?? []) {
    prepare(child);
    node.appendChild(child);
  }

  setProps(node, node.__props);

  return node;
}

function findNextSibling(node?: Node): Node | null | undefined {
  if (node instanceof DocumentFragment) {
    const lastChild = node.__childNodes?.[node.__childNodes.length - 1];
    if (lastChild) {
      return findNextSibling(lastChild);
    }
  } else if (node) {
    return node.nextSibling;
  }
}

function findParent(node: Node) {
  if (node instanceof DocumentFragment) {
    for (const child of node.__childNodes ?? []) {
      return findParent(child);
    }
  } else {
    return node.parentNode;
  }
}

function removeTree(node?: Node) {
  if (node instanceof DocumentFragment) {
    for (const child of node.__childNodes ?? []) {
      removeTree(child);
    }
  } else {
    node?.parentNode?.removeChild(node);
  }
}

function reconcile(parent: Node, nextSibling: Node | null, render?: Node | null, next?: Node | null) {
  if (!next) {
    if (render) {
      parent.removeChild(render);
    }
    return;
  }

  let node = next;
  if (next instanceof Element && next.nodeName === render?.nodeName) {
    node = render;
  }

  if (next instanceof DocumentFragment) {
    const childNodes = next.__childNodes ?? [];
    const renderChildNodes = render?.__childNodes ?? [];
    for (let i = 0; i < childNodes.length; i++) {
      const childNode = childNodes[i];
      const renderChildNode = renderChildNodes[i];
      const childNextSibling = render?.__childNodes?.[i + 1] ?? nextSibling;
      reconcile(parent, childNextSibling, renderChildNode, childNode);
    }
  } else {
    const childNodes = next.__childNodes ?? [];
    for (let i = 0; i < childNodes.length; i++) {
      const childNode = childNodes[i];
      const renderChildNode = render?.__childNodes?.[i];
      const childNextSibling = render?.__childNodes?.[i + 1] ?? null;
      reconcile(node, childNextSibling, renderChildNode, childNode);
    }
  }

  setProps(node, next.__props, render?.__props);

  if (!render) {
    parent.insertBefore(node, nextSibling);
  } else if (next.nodeName !== render.nodeName && render.nodeType !== 11) {
    parent.replaceChild(node, render);
  } else if (next.nodeName !== render.nodeName) {
    removeTree(render);
  }
}

function useCurrentComponentState<T>(initialValue: T) {
  const component = CURRENT_COMPONENT;
  if (!component) {
    throw Error("useState: Unknown component to update.");
  }
  let { tag, props, statePosition: stateIndex, state: stateValues } = component;

  // setup initial value
  const currentIndex = stateIndex;
  if (stateValues[currentIndex] == null) {
    stateValues[currentIndex] = initialValue;
  }
  const value = stateValues[currentIndex];

  // update state index
  stateIndex++;

  const update = (nextValue: T) => {
    const nextValues = [...stateValues];
    nextValues[currentIndex] = nextValue;

    const { node } = component;
    if (!node) {
      throw new Error("wat");
    }

    const newNode = renderComponent(tag, props, nextValues);
    const parent = findParent(node);
    if (!parent) {
      throw new Error("No parent");
    }
    const nextSibling = findNextSibling(node) ?? null;
    reconcile(parent, nextSibling, node, newNode);
  };

  return [value, update] as [T, (value: T) => void];
}

export function useState<V>(initialValue: V | (() => V)) {
  const [value, update] = useCurrentComponentState(initialValue instanceof Function ? initialValue() : initialValue);

  const set = (_value: V | ((prev: V) => V)) => {
    const nextValue = _value instanceof Function ? _value(value) : _value;
    update(nextValue);
  };

  return [value, set] as [V, typeof set];
}

export type Reducer<S, A> = (state: S, action: A) => S;
export function useReducer<S = any, A = any>(reducer: Reducer<S, A>, initialState: S, init?: (s: S) => S) {
  const [state, update] = useCurrentComponentState(init != null ? init(initialState) : initialState);

  const set = (action: A) => {
    const nextValue = reducer(state, action);
    update(nextValue);
  };

  return [state, set] as [S, typeof set];
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

type RecursiveArray<T> = Array<T | RecursiveArray<T>>;

declare global {
  interface Node {
    __parent?: Node;
    __before?: Node;
    __children?: JSX.Child[];
    __childNodes?: Node[];
    __props?: JSX.Props;
  }

  namespace JSX {
    type Child = null | string | number | boolean | Node | Child[];

    // only used for typing JSX properly
    // most internal use cases are just JSX.Child[]
    type Children = Child | Child[];

    type Props = Record<string, unknown>;

    type PropsWithChildren = { children: Children };

    type ComponentProps = Props & PropsWithChildren;

    type ComponentFunction<T = any> = (props: ComponentProps & T) => Children;

    type ComponentRef = {
      node?: Node;
      props: ComponentProps;
      statePosition: number;
      state: unknown[];
      tag: ComponentFunction;
    };

    type IntrinsicElements = {
      [key in keyof HTMLElementTagNameMap]: IntrinsicHTMLElement<key>;
    } & {
      [key: string]: any;
    };

    type Element = string | HTMLElement | DocumentFragment;

    type ElementType = keyof IntrinsicElements | ComponentFunction;
  }
}
