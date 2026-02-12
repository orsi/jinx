let CURRENT_COMPONENT: JSX.ComponentRef | undefined;

export function jsx(tag: string | JSX.ComponentFunction, props: JSX.Props, ...children: JSX.Child[]): Node {
  let node: Node;
  if (typeof tag === "function") {
    const component = renderComponent(tag, { ...props, children }, []);
    node = component.node!;
  } else {
    node = document.createElement(tag);
    node.__children = children;
    node.__childNodes = [];
    node.__props = props;
    for (const child of children) {
      const childNode = renderChild(child);
      node.__childNodes.push(childNode);
    }
  }

  // prepare for insertion in dom if not being rendered inside a component
  if (!CURRENT_COMPONENT) {
    prepare(node);
    attach(node, node.__childNodes);
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
  } as JSX.ComponentRef;

  const currentContext = CURRENT_COMPONENT;
  CURRENT_COMPONENT = component;
  const result = tag(props);
  component.node = renderChild(result);
  CURRENT_COMPONENT = currentContext;

  return component as JSX.ComponentRef;
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
  }

  setProps(node, node.__props);
  return node;
}

function attach(node: Node, childNodes: Node[] = []) {
  for (const child of childNodes) {
    attach(child, child.__childNodes);
    node.appendChild(child);
  }

  node.__childNodes = childNodes;
  return node;
}

function flattenFragment(fragment: DocumentFragment): Node[] {
  const childNodes = [];
  for (const node of fragment.__childNodes ?? []) {
    if (node instanceof DocumentFragment) {
      const subNodes = flattenFragment(node);
      childNodes.push(...subNodes);
    } else {
      childNodes.push(node);
    }
  }

  return childNodes;
}

function getFragmentParent(node: Node): Node | null {
  for (const childNode of node.__childNodes ?? []) {
    if (childNode instanceof DocumentFragment) {
      const parent = getFragmentParent(childNode);
      if (parent) {
        return parent;
      }
    } else if (childNode.parentNode) {
      return childNode.parentNode;
    }
  }

  return null;
}

function reconcileDom(last: Node, next: Node) {
  if (last instanceof Text && next instanceof Text) {
    last.textContent = next.textContent;
    return last;
  } else if (last instanceof DocumentFragment && next instanceof DocumentFragment) {
    const parent = getFragmentParent(last);
    if (parent == null) {
      throw new Error("Cmon buddy");
    }

    const lastNodes = flattenFragment(last);
    const nextNodes = flattenFragment(next);
    const end = lastNodes[lastNodes.length - 1]?.nextSibling ?? null;
    const length = Math.max(lastNodes.length, nextNodes.length);
    const reconciledNodes = [];
    for (let i = 0; i < length; i++) {
      const lastNode = lastNodes[i];
      const nextNode = nextNodes[i];
      if (lastNode && nextNode) {
        const reconciled = reconcileDom(lastNode, nextNode);
        reconciledNodes.push(reconciled);
      } else if (lastNode) {
        parent.removeChild(lastNode);
      } else if (nextNode) {
        prepare(nextNode);
        attach(nextNode, nextNode.__childNodes);
        parent.insertBefore(nextNode, end);
        reconciledNodes.push(nextNode);
      }
    }
    last.__childNodes = reconciledNodes;
    return last;
  } else if (last instanceof Element && next instanceof Element && last.nodeName === next.nodeName) {
    // reconcile children
    const lastChildNodes = last.__childNodes ?? [];
    const nextChildNodes = next.__childNodes ?? [];
    const length = Math.max(lastChildNodes.length, nextChildNodes.length);
    const reconciledChildNodes: Node[] = [];
    for (let i = 0; i < length; i++) {
      const lastChildNode = lastChildNodes[i];
      const nextChildNode = nextChildNodes[i];
      if (lastChildNode && nextChildNode) {
        const reconciled = reconcileDom(lastChildNode, nextChildNode);
        reconciledChildNodes.push(reconciled);
      } else if (lastChildNode) {
        next.removeChild(lastChildNode);
      } else if (nextChildNode) {
        prepare(nextChildNode);
        attach(nextChildNode, nextChildNode.__childNodes);
        next.appendChild(nextChildNode);
        reconciledChildNodes.push(nextChildNode);
      }
    }

    setProps(last, next.__props, last.__props);
    last.__childNodes = reconciledChildNodes;
    return last;
  } else {
    prepare(next);
    attach(next, next.__childNodes);

    if (last instanceof DocumentFragment) {
      const parent = getFragmentParent(last);
      if (parent == null) {
        throw new Error("watch it bub");
      }

      const fragmentChildren = flattenFragment(last);
      const firstChild = fragmentChildren.shift();
      if (firstChild != null) {
        parent.replaceChild(next, firstChild);
      } else {
        const end = fragmentChildren[fragmentChildren.length - 1];
        if (end) {
          parent.insertBefore(next, end);
        } else {
          parent.appendChild(next);
        }
      }

      let orphan = fragmentChildren.shift();
      while (orphan) {
        parent.removeChild(orphan);
        orphan = fragmentChildren.shift();
      }
    } else {
      const parent = last.parentNode;
      if (parent == null) {
        throw new Error("How dat happen");
      }

      parent.replaceChild(next, last);
    }

    return next;
  }
}

function useCurrentComponentState<T>(initialValue: T) {
  const lastComponent = CURRENT_COMPONENT;
  if (!lastComponent) {
    throw Error("useState: Unknown component to update.");
  }
  let { tag, props, statePosition: stateIndex, state: stateValues } = lastComponent;

  // setup initial value
  const currentIndex = stateIndex;
  if (stateValues[currentIndex] == null) {
    stateValues[currentIndex] = initialValue;
  }
  const value = stateValues[currentIndex];

  // update state index
  stateIndex++;

  const update = (nextValue: T) => {
    const t0 = performance.now();

    const nextValues = [...stateValues];
    nextValues[currentIndex] = nextValue;

    const { node: renderedNode } = lastComponent;
    if (!renderedNode) {
      throw new Error("wat");
    }

    const component = renderComponent(tag, props, nextValues);
    component.node = reconcileDom(renderedNode, component.node);

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

    type PropsWithChildren = { children?: Children };

    type ComponentProps = Props & PropsWithChildren;

    type ComponentFunction<T = any> = (props: ComponentProps & T) => Children;

    type ComponentRef = {
      node: Node;
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
