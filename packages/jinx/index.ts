/**
 * Global component rendering context. Enables the `use*` hooks to have access to
 * their current component context. When this variable is set, all calls to jsx()
 * will defer attaching their children to their container -- this enables the
 * reconcile() function to reuse inserted DOM nodes when possible.
 */
let COMPONENT_CONTEXT: JSX.ComponentRef | undefined;

/**
 * Creates a node that can be inserted into the standard browser DOM apis such
 * as document.body.append().
 */
export function jsx(tag: string | JSX.ComponentFunction, props: JSX.Props, ...children: JSX.Child[]): Node {
  props = props ?? {};

  let node: Node;
  if (typeof tag === "function") {
    props.children = children;

    // save parent component context
    const context = COMPONENT_CONTEXT;

    // set current component context so that calls to `use` hooks have access
    COMPONENT_CONTEXT = {
      props,
      state: {
        index: 0,
        values: [],
      },
      tag,
    } as JSX.ComponentRef;

    const result = tag(props);
    node = createChild(result);

    COMPONENT_CONTEXT.node = node;
    COMPONENT_CONTEXT = context;
  } else {
    node = document.createElement(tag);
    node.__childNodes = [];
    for (const child of children) {
      const childNode = createChild(child);
      node.__childNodes.push(childNode);
    }
  }

  /**
   * Only attach children when we are not inside a component context.
   * This ensures future renders caused by state updates don't remove children
   * already in the DOM, and we can reuse inserted nodes if possible inside the
   * reconcile() function.
   */
  if (COMPONENT_CONTEXT == null) {
    attach(node, node.__childNodes);
  }

  return commit(node, props);
}

/**
 * <></>
 */
export function Fragment(props: JSX.PropsWithChildren) {
  return props.children;
}

/**
 * Generic state setter for components.
 */
function useCurrentComponentState<T>(initialValue: T) {
  const component = COMPONENT_CONTEXT;
  if (!component) {
    throw new Error("No component is currently rendering");
  }

  // initial value
  const index = component.state.index;
  if (!component.state.values[index]) {
    component.state.values[index] = { value: initialValue };
  }
  const { value } = component.state.values[index];

  // advance state index
  component.state.index++;

  const update = (nextValue: T) => {
    const t0 = performance.now();

    const context = COMPONENT_CONTEXT;
    COMPONENT_CONTEXT = component;
    COMPONENT_CONTEXT.state.index = 0;
    COMPONENT_CONTEXT.state.values[index] = { value: nextValue };

    const result = COMPONENT_CONTEXT.tag(COMPONENT_CONTEXT.props);
    const node = createChild(result);

    if (!component.node) {
      throw new Error("Component has no rendered node.");
    }
    COMPONENT_CONTEXT.node = reconcile(node, component.node);
    COMPONENT_CONTEXT = context;

    if (window.__DEBUG__) {
      const t1 = performance.now();
      console.log(`${component.tag.name} rendered in ${t1 - t0} milliseconds.`);
    }
  };

  return [value, update] as [T, (value: T) => void];
}

/**
 * Returns state value and setter.
 */
export function useState<V>(initialValue: V | (() => V)) {
  const [value, update] = useCurrentComponentState(initialValue instanceof Function ? initialValue() : initialValue);

  const set = (_value: V | ((prev: V) => V)) => {
    const nextValue = _value instanceof Function ? _value(value) : _value;
    update(nextValue);
  };

  return [value, set] as [V, typeof set];
}

export type Reducer<S, A> = (state: S, action: A) => S;

/**
 * Returns data and dispatch function.
 */
export function useReducer<S = any, A = any>(reducer: Reducer<S, A>, initialState: S, init?: (s: S) => S) {
  const [state, update] = useCurrentComponentState(init != null ? init(initialState) : initialState);

  const set = (action: A) => {
    const nextValue = reducer(state, action);
    update(nextValue);
  };

  return [state, set] as [S, typeof set];
}

function createChild(child: JSX.Child) {
  let node: Node;
  if (child instanceof Node) {
    node = child;
  } else if (child == null || (Array.isArray(child) && child.length === 0)) {
    node = document.createComment("");
  } else if (typeof child === "boolean") {
    node = document.createComment(`${child}`);
  } else if (typeof child === "string" || typeof child === "number") {
    const text = child.toString();
    node = document.createTextNode(text);
  } else {
    node = document.createDocumentFragment();
    node.__childNodes = [];
    for (const subChild of child) {
      const subNode = createChild(subChild);
      node.__childNodes.push(subNode);
    }
  }

  return node;
}

function commit(element: Node, next: JSX.Props, previous?: JSX.Props) {
  if (!(element instanceof HTMLElement)) {
    return element;
  }

  // remove previous
  for (const [prop, value] of Object.entries(previous ?? {})) {
    const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in element;
    if (isEvent) {
      const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
      element.removeEventListener(eventName, value as EventListenerOrEventListenerObject);
    } else if (prop === "style" && value != null && typeof value === "object") {
      for (const [styleProp] of Object.entries(value)) {
        element.style.removeProperty(styleProp);
      }
    } else {
      element.removeAttribute(prop);
    }
  }

  // apply next
  for (const [prop, value] of Object.entries(next ?? {})) {
    const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in element;
    if (isEvent) {
      const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
      element.addEventListener(eventName, value as EventListenerOrEventListenerObject);
    } else if (prop === "style" && value != null && typeof value === "object") {
      for (const [styleProp, styleValue] of Object.entries(value)) {
        // n.b. element.style.setProperty() does not support camelCase style objects like
        // backgroundColor, fontSize, etc., but using bracket notation does!
        element.style[styleProp as StyleProperty] = styleValue;
      }
    } else {
      element.setAttribute(prop, value as string);
    }
  }

  element.__props = next;
  return element;
}

function reconcile(next: Node, last: Node) {
  if (last instanceof Text && next instanceof Text) {
    last.textContent = next.textContent;
    return last;
  } else if (last.nodeName === next.nodeName) {
    const parent = last instanceof DocumentFragment ? getParent(last) : last;
    const lastChildNodes = last.__childNodes ?? [];
    const nextChildNodes = next.__childNodes ?? [];
    const length = Math.max(lastChildNodes.length, nextChildNodes.length);
    const reconciledChildNodes: Node[] = [];
    for (let i = 0; i < length; i++) {
      const lastChildNode = lastChildNodes[i];
      const nextChildNode = nextChildNodes[i];
      if (lastChildNode && nextChildNode) {
        const reconciled = reconcile(nextChildNode, lastChildNode);
        reconciledChildNodes.push(reconciled);
      } else if (lastChildNode) {
        parent.removeChild(lastChildNode);
      } else if (nextChildNode) {
        attach(nextChildNode, nextChildNode.__childNodes);
        parent.appendChild(nextChildNode);
        reconciledChildNodes.push(nextChildNode);
      }
    }
    last.__childNodes = reconciledChildNodes;

    // recommit next props onto reused last node
    return commit(last, next.__props ?? {}, last.__props);
  } else {
    // next is already been committed via jsx() call, so we only need to
    // attach childNodes and replace the last node
    attach(next, next.__childNodes);
    replace(next, last);
    return next;
  }
}

function attach(node: Node, childNodes: Node[] = []) {
  for (const child of childNodes) {
    attach(child, child.__childNodes);
    node.appendChild(child);
  }
}

function getParent(node: Node): Node {
  if (node.parentNode != null) {
    return node.parentNode;
  } else {
    for (const childNode of node.__childNodes ?? []) {
      const parent = getParent(childNode);
      if (parent) {
        return parent;
      }
    }
  }

  throw new Error("Node has no parent");
}

function getChildNodes(node: Node): ChildNode[] {
  const childNodes: ChildNode[] = [];
  for (const childNode of node.__childNodes ?? []) {
    if (childNode instanceof DocumentFragment) {
      const subNodes = getChildNodes(childNode);
      childNodes.push(...subNodes);
    } else {
      childNodes.push(childNode as ChildNode);
    }
  }

  return childNodes;
}

function replace(next: Node, last: Node) {
  const parent = getParent(last);
  if (last instanceof DocumentFragment) {
    const childNodes = getChildNodes(last);
    const firstChild = childNodes.shift();
    if (firstChild == null) {
      throw new Error("DocumentFragment has no childNodes.");
    }
    parent.replaceChild(next, firstChild);

    let orphan = childNodes.shift();
    while (orphan) {
      parent.removeChild(orphan);
      orphan = childNodes.shift();
    }
  } else {
    parent.replaceChild(next, last);
  }
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

/**
 * When accessing the `style` property of an HTMLElement dynamically, typing
 * a string to `keyof CSSStyleDeclaration` doesn't work for some reason.
 * cf. https://github.com/microsoft/TypeScript/issues/17827#issuecomment-2008561761
 */
type StyleProperty = Exclude<
  keyof Omit<
    CSSStyleDeclaration,
    "length" | "parentRule" | "getPropertyPriority" | "getPropertyValue" | "item" | "removeProperty" | "setProperty"
  >,
  number
>;

declare global {
  interface Window {
    __DEBUG__?: boolean;
  }

  // TODO: Attempt to avoid monkey patching Nodes
  interface Node {
    /**
     * Required for retaining references to childNodes attached and moved from
     * a DocumentFragment.
     */
    __childNodes?: Node[];
    __props?: JSX.Props;
  }

  namespace JSX {
    type Child = null | string | number | boolean | Node | Child[];

    type Children = Child | Child[];

    type Props = Record<string, unknown>;

    type PropsWithChildren = { children?: Children };

    type ComponentProps = Props & PropsWithChildren;

    type ComponentFunction<T = any> = (props: ComponentProps & T) => Children;

    type ComponentState = {
      index: number;
      values: {
        value: unknown;
      }[];
    };

    type ComponentRef = {
      node?: Node;
      props: ComponentProps;
      state: ComponentState;
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
