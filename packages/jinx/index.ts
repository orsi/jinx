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
  const nodes: JSX.NodeOrNodes = [];

  let lastNode: Node | undefined;
  for (const child of children ?? []) {
    // accumulate text in one node if the last node was #text
    if ((typeof child === "string" || typeof child === "number") && lastNode?.nodeType === Node.TEXT_NODE) {
      lastNode.textContent += child.toString();
      continue;
    }

    if (Array.isArray(child)) {
      const nodeArray = renderChildren(child);
      lastNode = undefined;
      nodes.push(nodeArray);
    } else if (child instanceof Node) {
      if (child.__jsx && child.__jsx.children && !child.__jsx.childNodes) {
        const childNodes = renderChildren(child.__jsx.children);
        child.__jsx.childNodes = childNodes;
      }
      lastNode = child;
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

function attachTree(node: Node, childNodes?: JSX.NodeOrNodes) {
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
    setProps(node, node.__jsx);
  }
}

function findDomParent(node: Node | JSX.NodeOrNodes): Node | null {
  let dom: Node | null = null;
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
    dom = node.parentNode;
  }

  return dom;
}

function setProps(target: Node, next?: JSX.Ref, previous?: JSX.Ref) {
  if (!(target instanceof HTMLElement)) {
    return;
  }

  // remove last
  const previousProps = previous?.args.props ?? {};
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

  // set new
  const nextProps = next?.args.props ?? {};
  for (const [prop, value] of Object.entries(nextProps)) {
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

  if (target.__jsx) {
    target.__jsx.args.props = nextProps;
  }
}

function removeTree(node?: Node | JSX.NodeOrNodes) {
  if (!node) {
    return;
  } else if (Array.isArray(node)) {
    for (const subNode of node) {
      removeTree(subNode);
    }
  } else {
    for (const child of node.__jsx?.childNodes ?? []) {
      removeTree(child);
    }
    node.parentNode?.removeChild(node);
  }
}

function reconcileNodes(
  parent: Node,
  next?: Node | JSX.NodeOrNodes,
  rendered?: Node | JSX.NodeOrNodes
): Node | JSX.NodeOrNodes | undefined {
  if (!next && !rendered) {
    // noop
  } else if (Array.isArray(next) && Array.isArray(rendered)) {
    const length = Math.max(next.length, rendered.length);
    const nodes = [];
    for (let i = 0; i < length; i++) {
      const node = reconcileNodes(parent, next?.[i], rendered?.[i]);
      if (node) {
        nodes.push(node);
      }
    }
    return nodes;
  } else if (next instanceof Node && rendered instanceof Node) {
    let node = rendered;
    if (next.nodeType !== rendered.nodeType || next.nodeName !== rendered.nodeName) {
      // replace
      attachTree(next, next.__jsx?.childNodes);
      setProps(next, next.__jsx);
      parent.replaceChild(next, rendered);
      node = next;
    } else if (next instanceof Text && rendered instanceof Text) {
      rendered.textContent = next.textContent;
    } else {
      setProps(rendered, next.__jsx, rendered.__jsx);
      const nodes = reconcileNodes(parent, next.__jsx?.childNodes, rendered.__jsx?.childNodes);
      if (nodes && rendered.__jsx) {
        rendered.__jsx.childNodes = Array.isArray(nodes) ? nodes : [nodes];
      }
    }
    return node;
  } else if (Array.isArray(next)) {
    removeTree(rendered);
    const nodes = [];
    for (const n of next) {
      const node = reconcileNodes(parent, n);
      if (node) {
        nodes.push(node);
      }
    }
    return nodes;
  } else if (next instanceof Node) {
    removeTree(rendered);
    attachTree(next, next.__jsx?.childNodes);
    setProps(next, next.__jsx);
    parent.appendChild(next);
    removeTree(rendered);
    return next;
  } else {
    removeTree(rendered);
  }
}

function useCurrentComponentState<T>(initialValue: T) {
  const previous = CURRENT_COMPONENT;
  if (previous == null) {
    throw Error("useState: Unknown component to update.");
  }

  const index = previous.state.index;

  // setup initial value
  if (previous.state.values[index] == null) {
    previous.state.values[index] = initialValue;
  }

  const value = previous.state.values[index];

  // update state index
  previous.state.index++;

  const update = (nextValue: T, index: number) => {
    if (!previous.jsx?.node) {
      throw new Error("wat");
    }

    const values = [...previous.state.values];
    values[index] = nextValue;

    const jsx: JSX.Ref = {
      args: previous.jsx.args,
      node: document.createDocumentFragment(),
    };
    jsx.node!.__jsx = jsx;

    // render next component
    jsx.component = renderComponent(previous.tag, previous.props, values, jsx);
    if (Array.isArray(jsx.component.output)) {
      jsx.children = jsx.component.output;
    } else if (jsx.component.output) {
      jsx.children = [jsx.component.output];
    }

    if (jsx.children) {
      jsx.childNodes = renderChildren(jsx.children);
    }

    const parent = findDomParent(previous.jsx.node);
    if (!parent) {
      throw new Error("can't do much now can we");
    }

    const childNodes = reconcileNodes(parent, jsx.childNodes, previous.jsx.childNodes);
    if (Array.isArray(childNodes)) {
      jsx.childNodes = childNodes;
    } else if (childNodes) {
      jsx.childNodes = [childNodes];
    }
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
      childNodes?: NodeOrNodes;
      component?: ComponentRef;
      node?: Node;
    };

    type NodeOrNodes = (NodeOrNodes | Node)[];

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
