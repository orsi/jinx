let COMPONENT_CONTEXT: JSX.ComponentRef | undefined;

function createComponent(tag: JSX.ComponentFunction, props: JSX.ComponentProps, state: unknown[] = []) {
  const component: JSX.ComponentRef = {
    props,
    stateIndex: 0,
    state,
    tag,
  } as JSX.ComponentRef;

  // save previous context
  const context = COMPONENT_CONTEXT;
  COMPONENT_CONTEXT = component;

  component.node = renderChild(tag(props));

  // restore previous context
  COMPONENT_CONTEXT = context;

  return component as JSX.ComponentRef;
}

function getComponentContext() {
  if (COMPONENT_CONTEXT == null) {
    throw new Error("No component is currently rendering");
  }

  return COMPONENT_CONTEXT;
}

function isComponentRendering() {
  return COMPONENT_CONTEXT != null;
}

/**
 * <></>
 */
export function Fragment(props: JSX.PropsWithChildren) {
  return props.children;
}

export function jsx(tag: string | JSX.ComponentFunction, props: JSX.Props, ...children: JSX.Child[]): Node {
  let node: Node;
  if (typeof tag === "function") {
    props = props ?? {};
    props.children = children;
    const component = createComponent(tag, props);
    node = component.node;
  } else {
    node = document.createElement(tag);
    node.__childNodes = [];
    node.__props = props;
    for (const child of children) {
      const childNode = renderChild(child);
      node.__childNodes.push(childNode);
    }
  }

  // TODO: is this needed? is there any benefit to defer preparing every jsx element
  // until the last/root jsx element?

  // prepare for insertion if not being rendered inside a component
  if (!isComponentRendering()) {
    prepare(node);
  }

  return node;
}

function renderChild(child: JSX.Child) {
  if (child instanceof Node) {
    return child;
  } else if (child == null || (Array.isArray(child) && child.length === 0)) {
    return document.createComment("");
  } else if (typeof child === "boolean") {
    return document.createComment(`${child}`);
  } else if (typeof child === "string" || typeof child === "number") {
    const text = child.toString();
    const node = document.createTextNode(text);
    return node;
  } else {
    const node = document.createDocumentFragment();
    node.__childNodes = [];
    for (const subChild of child) {
      const subNode = renderChild(subChild);
      node.__childNodes.push(subNode);
    }
    return node;
  }
}

function commit(target: Node, next: Node, previous?: Node) {
  if (target instanceof Text) {
    target.textContent = next.textContent;
  } else if (target instanceof HTMLElement) {
    const previousProps = previous?.__props ?? {};
    // remove previous
    for (const [prop, value] of Object.entries(previousProps)) {
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

    // apply next
    const props = next?.__props ?? {};
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
  } else {
    // noop
  }

  return target;
}

function prepare(node: Node) {
  for (const child of node.__childNodes ?? []) {
    prepare(child);
    node.appendChild(child);
  }

  return commit(node, node);
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

function getFragmentChildNodes(fragment: DocumentFragment): Node[] {
  const childNodes = [];
  for (const node of fragment.__childNodes ?? []) {
    if (node instanceof DocumentFragment) {
      const subNodes = getFragmentChildNodes(node);
      childNodes.push(...subNodes);
    } else {
      childNodes.push(node);
    }
  }

  return childNodes;
}

function reconcile(last: Node, next: Node) {
  if (last instanceof Text && next instanceof Text) {
    return commit(last, next);
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
        const reconciled = reconcile(lastChildNode, nextChildNode);
        reconciledChildNodes.push(reconciled);
      } else if (lastChildNode) {
        parent.removeChild(lastChildNode);
      } else if (nextChildNode) {
        prepare(nextChildNode);
        parent.appendChild(nextChildNode);
        reconciledChildNodes.push(nextChildNode);
      }
    }
    last.__childNodes = reconciledChildNodes;

    return commit(last, next, last);
  } else {
    const node = prepare(next);
    const parent = getParent(last);
    if (last instanceof DocumentFragment) {
      const fragmentChildren = getFragmentChildNodes(last);
      const firstChild = fragmentChildren.shift();
      if (firstChild == null) {
        throw new Error("how?");
      }
      parent.replaceChild(node, firstChild);

      let orphan: Node | undefined;
      while ((orphan = fragmentChildren.shift())) {
        parent.removeChild(orphan);
      }
    } else {
      parent.replaceChild(node, last);
    }
    return node;
  }
}

function useCurrentComponentState<T>(initialValue: T) {
  const lastComponent = getComponentContext();

  // initial value
  const index = lastComponent.stateIndex;
  if (lastComponent.state[index] == null) {
    lastComponent.state[index] = initialValue;
  }
  const value = lastComponent.state[index];

  // advance state index
  lastComponent.stateIndex++;

  const update = (nextValue: T) => {
    const t0 = performance.now();

    const nextValues = [...lastComponent.state];
    nextValues[index] = nextValue;

    const component = createComponent(lastComponent.tag, lastComponent.props, nextValues);
    component.node = reconcile(lastComponent.node, component.node);

    const t1 = performance.now();
    console.log(`${component.tag.name} rendered in ${t1 - t0} milliseconds.`);
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

declare global {
  interface Node {
    /** retains references to childNodes attached and moved from a DocumentFragment */
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

    type ComponentRef = {
      node: Node;
      props: ComponentProps;
      stateIndex: number;
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
