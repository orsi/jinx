let CURRENT_COMPONENT: JSX.ComponentRef | undefined;

function renderComponent(
  tag: JSX.ComponentFunction,
  props: JSX.ComponentProps,
  stateValues?: unknown[],
  jsx?: JSX.Ref
): JSX.ComponentRef {
  const component: JSX.ComponentRef = {
    jsx,
    props,
    output: undefined,
    state: {
      index: 0,
      values: stateValues ?? [],
    },
    tag,
  };

  const currentContext = CURRENT_COMPONENT;
  CURRENT_COMPONENT = component;
  component.output = tag(component.props);
  CURRENT_COMPONENT = currentContext;

  return component;
}

function renderChild(child: JSX.Child): Node | undefined {
  if (child instanceof Node) {
    return child;
  } else if (typeof child === "string" || typeof child === "number") {
    const text = child.toString();
    const node = document.createTextNode(text);
    return node;
  } else if (typeof child === "boolean") {
    return undefined;
  } else {
    return undefined;
  }
}

function renderChildren(children?: JSX.Children[]) {
  const nodes: JSX.NodeOrNodeArray = [];

  let lastNode: Node | undefined;
  for (const child of children ?? []) {
    // accumulate text in one node if the last node was #text
    if ((typeof child === "string" || typeof child === "number") && lastNode?.nodeType === Node.TEXT_NODE) {
      lastNode.textContent += child.toString();
      continue;
    }

    if (Array.isArray(child)) {
      const nodeArray = renderChildren(child);
      nodes.push(nodeArray);
    } else if (child instanceof Node) {
      if (child.__jsx && child.__jsx.children && !child.__jsx.childNodes) {
        const childNodes = renderChildren(child.__jsx.children);
        child.__jsx.childNodes = childNodes;
      }
      nodes.push(child);
    } else {
      const node = renderChild(child);
      lastNode = node;
      if (node) {
        nodes.push(node);
      }
    }
  }

  return nodes;
}

function attachTree(node: Node, childNodes?: JSX.NodeOrNodeArray) {
  for (const child of childNodes ?? []) {
    if (Array.isArray(child)) {
      attachTree(node, child);
    } else {
      if (child.__jsx?.childNodes) {
        attachTree(child, child.__jsx.childNodes);
      }

      node.appendChild(child);
    }
  }

  if (node instanceof HTMLElement) {
    setProps(node, node.__jsx?.args.props);
  }
}

export function jsx(tag: string | JSX.ComponentFunction, props: JSX.Props, ...children: JSX.Children[]): Node {
  const jsx: JSX.Ref = {
    args: {
      children,
      props,
      tag,
    },
  };

  if (typeof tag === "function") {
    const component = renderComponent(tag, { ...props, children }, undefined, jsx);
    const node = document.createDocumentFragment();

    jsx.component = component;
    jsx.node = node;
    if (Array.isArray(component.output)) {
      jsx.children = component.output;
    } else if (component.output) {
      jsx.children = [component.output];
    }
  } else {
    const element = document.createElement(tag);
    jsx.node = element;
    jsx.children = children;
  }
  jsx.node.__jsx = jsx;

  // only render children when this is the top-level JSX element
  if (!CURRENT_COMPONENT) {
    const childNodes = renderChildren(jsx.children);
    jsx.childNodes = childNodes;
    attachTree(jsx.node, jsx.childNodes);
  }

  return jsx.node;
}

export function Fragment(props: JSX.PropsWithChildren) {
  return props.children;
}

type DomParentAndFirstChild = {
  parent: Node | null;
  firstChild: Node;
  firstChildIndex: number;
};
function findDomParent(node: Node | JSX.NodeOrNodeArray): DomParentAndFirstChild | undefined {
  let dom: DomParentAndFirstChild | undefined;
  if (node instanceof DocumentFragment) {
    for (const child of node.__jsx?.childNodes ?? []) {
      dom = findDomParent(child);
      if (dom) {
        break;
      }
    }
  } else if (Array.isArray(node)) {
    for (const child of node) {
      dom = findDomParent(child);
      if (dom) {
        break;
      }
    }
  } else {
    dom = {
      parent: node.parentNode,
      firstChild: node,
      firstChildIndex: [...(node.parentNode?.childNodes ?? [])].findIndex((el) => el === node),
    };
  }

  return dom;
}

function removeTree(node?: JSX.NodeOrNodeArray[number]) {
  if (Array.isArray(node)) {
    for (const subNode of node) {
      removeTree(subNode);
    }
  } else {
    node?.parentNode?.removeChild(node);
  }
}

function reconcile(
  domParent: Node,
  firstChild: Node,
  startIndex: number,
  previous?: JSX.NodeOrNodeArray[number],
  next?: JSX.NodeOrNodeArray[number]
) {
  if (Array.isArray(next)) {
    // next is an array
    if (Array.isArray(previous)) {
      const maxLength = Math.max(previous.length, next.length);
      for (let i = 0; i < maxLength; i++) {
        reconcile(domParent, firstChild, startIndex, previous[i], next[i]);
      }
    } else {
      removeTree(previous);
    }
  } else if (next instanceof Node) {
    // next is a node now!
    if (Array.isArray(previous)) {
      removeTree(previous);
    } else if (next.nodeName !== previous?.nodeName || !previous) {
      removeTree(previous);
    } else {
      // next and previous are both nodes
      if (next instanceof Text) {
        previous.textContent = next.textContent;
      } else if (next instanceof DocumentFragment) {
        reconcile(domParent, firstChild, startIndex, previous?.__jsx?.childNodes, next?.__jsx?.childNodes);
      } else if (next instanceof HTMLElement) {
        // same node in same slot, so reuse previous
        reconcile(previous, firstChild, startIndex, previous?.__jsx?.childNodes, next?.__jsx?.childNodes);
        setProps(previous as HTMLElement, next.__jsx?.args.props, previous.__jsx?.args.props);
        previous.__jsx!.args = next.__jsx!.args;
      } else {
        domParent.replaceChild(next, previous);
        setProps(next as HTMLElement, next.__jsx?.args.props, previous?.__jsx?.args.props);
      }
    }
  } else {
    // next no longer exists, remove everything previous
    removeTree(previous);
  }
}

function setProps(element: HTMLElement, props?: JSX.Props, lastProps?: JSX.Props) {
  // remove last
  for (const [prop, value] of Object.entries(lastProps ?? {})) {
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

  // set new
  for (const [prop, value] of Object.entries(props ?? {})) {
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
}

function useCurrentComponentState<T>(initialValue: T) {
  const component = CURRENT_COMPONENT;
  if (component == null) {
    throw Error("useState: Unknown component to update.");
  }

  const index = component.state.index;

  // setup initial value
  if (component.state.values[index] == null) {
    component.state.values[index] = initialValue;
  }

  const value = component.state.values[index];

  // update state index
  component.state.index++;

  const update = (nextValue: T, index: number) => {
    if (!component.jsx?.node) {
      throw new Error("wat");
    }

    const values = [...component.state.values];
    values[index] = nextValue;

    const dom = findDomParent(component.jsx.node);
    if (!dom || !dom.parent) {
      throw new Error("wat 2");
    }

    const jsx: JSX.Ref = {
      ...component.jsx,
    };

    const render = renderComponent(component.tag, component.props, values, jsx);
    const normalizedChildren = Array.isArray(render.output)
      ? render.output
      : render.output
      ? [render.output]
      : undefined;
    let childNodes: JSX.NodeOrNodeArray | undefined;
    if (normalizedChildren) {
      childNodes = renderChildren(normalizedChildren);
    }
    const previousChildNodes = component.jsx.childNodes;
    reconcile(dom.parent, dom.firstChild, dom.firstChildIndex, previousChildNodes, childNodes);
  };

  return [value, index, update] as [T, number, (value: T, index: number) => void];
}

export function useState<V>(initialValue: V | (() => V)) {
  const [value, index, update] = useCurrentComponentState(
    initialValue instanceof Function ? initialValue() : initialValue
  );

  const set = (_value: V | ((prev: V) => V)) => {
    const nextValue = _value instanceof Function ? _value(value) : _value;
    update(nextValue, index);
  };

  return [value, set] as [V, typeof set];
}

export type Reducer<S, A> = (state: S, action: A) => S;
export function useReducer<S = any, A = any>(reducer: Reducer<S, A>, initialState: S, init?: (s: S) => S) {
  const [state, index, update] = useCurrentComponentState(init != null ? init(initialState) : initialState);

  const set = (action: A) => {
    const nextValue = reducer(state, action);
    update(nextValue, index);
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
    __jsx?: JSX.Ref;
  }

  namespace JSX {
    type Ref = {
      args: {
        children: Children[];
        props: Props;
        tag: string | ComponentFunction;
      };
      children?: Children[];
      childNodes?: NodeOrNodeArray;
      component?: ComponentRef;
      node?: Node;
    };

    // interface NestedNodeArray extends Array<NestedNodeArray | Node> {}
    type NodeOrNodeArray = (NodeOrNodeArray | Node)[];

    type Child = string | number | boolean | Node | Child[];

    type Children = Child | Child[];

    type RenderedChildren = Node[];

    type Props = Record<string, unknown> | null;

    type PropsWithChildren = { children: Children };

    type ComponentProps = Props & PropsWithChildren;

    type ComponentFunction<T = any> = (props: ComponentProps & T) => Children;

    type ComponentRef = {
      jsx?: Ref;
      output?: ReturnType<ComponentFunction>;
      props: ComponentProps;
      state: {
        index: number;
        values: unknown[];
      };
      tag: ComponentFunction;
    };

    type IntrinsicElements = {
      [key in keyof HTMLElementTagNameMap]: IntrinsicHTMLElement<key>;
    } & {
      [key: string]: any;
    };

    interface ElementChildrenAttribute {
      children: {};
    }

    type Element = string | HTMLElement | DocumentFragment;

    type ElementType = keyof IntrinsicElements | ComponentFunction;
  }
}
