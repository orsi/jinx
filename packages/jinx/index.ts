declare global {
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

  interface Window {
    __DEBUG__?: boolean;
  }

  // TODO: Attempt to avoid monkey patching Nodes
  interface Node {
    __jinx?: JSX.Ref;
  }

  namespace JSX {
    type Ref = {
      children: Children[];
      component?: ComponentRef;
      tag: string | ComponentFunction;
      props: Props;
      /**
       * Required for retaining references to childNodes attached and moved from
       * a DocumentFragment.
       */
      childNodes?: Node[];
    };

    type Child = null | string | number | boolean | Node | Child[];

    type Children = Child | Child[];

    type Props = Record<string, unknown>;

    type PropsWithChildren = { children?: Children };

    type ComponentProps = Props & PropsWithChildren;

    type ComponentFunction<T = any> = (props: ComponentProps & T) => Children;

    type ComponentRef = {
      props: ComponentProps;
      renderState: string;
      hooksIndex: number;
      hooks: any[];
      tag: ComponentFunction;
      result: Children;
      childNode?: Node;
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

/**
 * Current component rendering context. Enables hooks to have access to
 * their current component context. When this variable is set, all calls to jsx()
 * will defer attaching their children to their container -- this enables the
 * reconcile() function to reuse inserted DOM nodes when possible.
 */
const COMPONENT_REF: {
  current: JSX.ComponentRef | undefined;
} = { current: undefined };

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
    node.__jinx = { childNodes: [] } as unknown as JSX.Ref; // TODO: remove
    for (const subChild of child) {
      const subNode = createChild(subChild);
      node.__jinx.childNodes?.push(subNode);
    }
  }

  return node;
}

function createComponent(tag: JSX.ComponentFunction, props: JSX.Props) {
  // save context
  const context = COMPONENT_REF.current;

  // set current component context so that calls to `use` hooks have access
  const component = {
    renderState: "init",
    props,
    hooksIndex: 0,
    hooks: [],
    tag,
  } as unknown as JSX.ComponentRef; // result will eventually be set

  COMPONENT_REF.current = component;

  component.result = tag(props);

  // restore context
  COMPONENT_REF.current = context;

  return component;
}

function rerenderComponent(component: JSX.ComponentRef) {
  const t0 = performance.now();

  // save context
  const context = COMPONENT_REF.current;
  COMPONENT_REF.current = component;

  // reset hook index
  component.hooksIndex = 0;
  component.result = component.tag(component.props);

  const newNode = createChild(component.result);

  if (!component.childNode) {
    throw new Error("No node for component");
  }
  component.childNode = reconcile(newNode, component.childNode);

  // restore context
  COMPONENT_REF.current = context;

  if (window.__DEBUG__) {
    const t1 = performance.now();
    console.log(`${component.tag.name} rerendered in ${t1 - t0}ms.`);
  }

  return component;
}

function hasComponentContext() {
  return COMPONENT_REF.current !== undefined;
}

function getCurrentComponent() {
  if (!COMPONENT_REF.current) {
    throw new Error("No component.");
  }

  return COMPONENT_REF.current;
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
  for (const [prop, value] of Object.entries(next)) {
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

  // transfer next props
  if (element.__jinx) {
    element.__jinx.props = next;
  }

  return element;
}

function reconcile(next: Node, last: Node) {
  if (last instanceof Text && next instanceof Text) {
    last.textContent = next.textContent;
    return last;
  } else if (last.nodeName === next.nodeName) {
    const parent = last instanceof DocumentFragment ? getParent(last) : last;
    const lastChildNodes = last.__jinx?.childNodes ?? [];
    const nextChildNodes = next.__jinx?.childNodes ?? [];
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
        attach(nextChildNode, nextChildNode.__jinx?.childNodes);
        parent.appendChild(nextChildNode);
        reconciledChildNodes.push(nextChildNode);
      }
    }

    if (last.__jinx) {
      last.__jinx.childNodes = reconciledChildNodes;
    }

    // recommit next props onto reused last node
    return commit(last, next.__jinx?.props ?? {}, last.__jinx?.props);
  } else {
    // next is already been committed via jsx() call, so we only need to
    // attach childNodes and replace the last node
    attach(next, next.__jinx?.childNodes);
    replace(next, last);
    return next;
  }
}

function attach(node: Node, childNodes: Node[] = []) {
  for (const child of childNodes) {
    attach(child, child.__jinx?.childNodes);
    node.appendChild(child);
  }
}

function getParent(node: Node): Node {
  if (node.parentNode != null) {
    return node.parentNode;
  } else {
    for (const childNode of node.__jinx?.childNodes ?? []) {
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
  for (const childNode of node.__jinx?.childNodes ?? []) {
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

/**
 * Creates a node that can be inserted into the standard browser DOM apis such
 * as document.body.append().
 */
export function jsx(tag: string | JSX.ComponentFunction, props: JSX.Props, ...children: JSX.Child[]): Node {
  const ref: JSX.Ref = {
    children,
    tag,
    props,
  };

  props = props ?? {};

  let node: Node;
  if (typeof tag === "function") {
    props.children = children;
    const component = createComponent(tag, props);
    component.childNode = createChild(component.result);
    node = component.childNode;
    ref.component = component;
    ref.childNodes = node.__jinx?.childNodes;
  } else {
    node = document.createElement(tag);
    ref.childNodes = [];
    for (const child of children) {
      const childNode = createChild(child);
      ref.childNodes.push(childNode);
    }
  }

  /**
   * Only attach children when we are not inside a component context.
   * This ensures future renders caused by state updates don't remove children
   * already in the DOM, and we can reuse inserted nodes if possible inside the
   * reconcile() function.
   */
  if (!hasComponentContext()) {
    attach(node, node.__jinx?.childNodes);
  }

  node.__jinx = ref;
  JSX_NODES_SET.add(node);

  const commitedNode = commit(node, props);
  return commitedNode;
}

// this is crazy! Why is there no api that replaces DOMNodeInserted and related events???
const observer = new MutationObserver((mutations) => {
  for (const node of JSX_NODES_SET) {
    if (document.contains(node)) {
      if (node.__jinx?.component?.renderState === "init") {
        node.__jinx.component.hooks.forEach((hook) => {
          if (hook.value?.effect) {
            hook.value.effect();
          }
        });
        node.__jinx.component.renderState = "rendered";
      }
    }
  }
});
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

const JSX_NODES_SET = new Set<Node>();

/**
 * <></>
 */
export function Fragment(props: JSX.PropsWithChildren) {
  return props.children;
}

/**
 * Generic hook creation.
 */
function useHook<T>(_hook: { type: string; initialValue: T }) {
  const component = getCurrentComponent();

  const index = component.hooksIndex;
  let hook = component.hooks[index];
  if (!hook) {
    hook = component.hooks[index] = {
      index,
      ..._hook,
      value: _hook.initialValue,
      parent: component,
    };
  }

  // advance hook index
  component.hooksIndex++;

  return hook;
}

/**
 * Returns state value and setter.
 */
export function useEffect<V>(effect: Function, dependencies?: unknown[]) {
  useHook({
    type: "useEffect",
    initialValue: {
      effect,
      dependencies,
    },
  });
}

/**
 * Returns state value and setter.
 */
export function useState<V>(initialValue: V | (() => V)) {
  const hook = useHook({
    type: "useState",
    initialValue: initialValue instanceof Function ? initialValue() : initialValue,
  });

  const set = (value: V | ((prev: V) => V)) => {
    const nextValue = value instanceof Function ? value(hook.value) : value;
    if (Object.is(nextValue, hook.value)) {
      // same value
      return false;
    }

    hook.value = nextValue;
    return rerenderComponent(hook.parent);
  };

  return [hook.value, set] as [V, typeof set];
}

export type Reducer<S, A> = (state: S, action: A) => S;

/**
 * Returns data and dispatch function.
 */
export function useReducer<S = any, A = any>(reducer: Reducer<S, A>, initialState: S, init?: (s: S) => S) {
  const hook = useHook({
    type: "useReducer",
    initialValue: init != null ? init(initialState) : initialState,
  });

  const set = (action: A) => {
    const nextValue = reducer(hook.value, action);
    if (Object.is(nextValue, hook.value)) {
      // same value
      return false;
    }

    hook.value = nextValue;
    return rerenderComponent(hook.parent);
  };

  return [hook.value, set] as [S, typeof set];
}
