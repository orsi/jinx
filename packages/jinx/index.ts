let CURRENT_COMPONENT: JSX.ComponentRef | undefined;

export function jsx(tag: string | JSX.ComponentFunction, props: JSX.Props, ...children: JSX.Child[]): Node {
  const node = typeof tag === "function" ? document.createDocumentFragment() : document.createElement(tag);

  if (typeof tag === "function") {
    const component = renderComponent(node, tag, { ...props, children }, []);
    if (component.output) {
      node.__children = [component.output];
    }
  } else {
    node.__children = children;
  }

  // only commit when this is the top-level JSX element
  if (!CURRENT_COMPONENT) {
    commit(node);
  }

  return node;
}

export function Fragment(props: JSX.PropsWithChildren) {
  return props.children;
}

function renderComponent(
  node: Node,
  tag: JSX.ComponentFunction,
  props: JSX.ComponentProps,
  stateValues: unknown[]
): JSX.ComponentRef {
  const component: JSX.ComponentRef = {
    node: node,
    output: undefined,
    props,
    state: {
      index: 0,
      values: stateValues ?? [],
    },
    tag,
  };

  const currentContext = CURRENT_COMPONENT;
  CURRENT_COMPONENT = component;
  component.output = tag(props);
  CURRENT_COMPONENT = currentContext;

  return component;
}

function renderChild(children: JSX.Child): Node {
  if (children instanceof Node) {
    return children;
  } else if (typeof children === "string" || typeof children === "number") {
    const text = children.toString();
    const node = document.createTextNode(text);
    return node;
  } else if (typeof children === "boolean") {
    // empty
    return document.createTextNode("");
  } else {
    const node = document.createDocumentFragment();
    node.__children = children;
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

function commit(node: Node, previous?: Node) {
  if (!node.__children) {
    return node;
  }

  node.__childNodes = [];
  let lastNode: Node | undefined;
  for (const child of node.__children) {
    // accumulate text in one node if the last node was #text
    if (
      lastNode?.nodeType === Node.TEXT_NODE &&
      (typeof child === "string" || typeof child === "number" || typeof child === "boolean")
    ) {
      if (typeof child !== "boolean") {
        lastNode.textContent += child.toString();
      }
      continue;
    }

    const childNode = renderChild(child);
    commit(childNode);
    node.__childNodes.push(childNode);
    node.appendChild(childNode);
    lastNode = childNode;
  }

  setProps(node, node.__props);
  return node;
}

type DomPosition = {
  parent: Node | null;
  afterChild: Node | null;
  beforeChild: Node | null;
};

function findDomParent(node: Node): DomPosition | null {
  let domPosition: DomPosition | null = null;

  if (Array.isArray(node)) {
    let parent: Node | null = null;
    let firstChild: Node | null = null;
    let lastChild: Node | null = null;
    for (let i = 0; i < node.length; i++) {
      const child = node[i];
      if (child instanceof HTMLElement) {
        if (firstChild == null) {
          firstChild = child;
        }

        lastChild = child;
      }
      const position = findDomParent(child);
      if (!parent && position?.parent) {
        parent = position.parent;
      }
    }

    domPosition = {
      parent,
      afterChild: firstChild?.previousSibling as Node,
      beforeChild: lastChild?.nextSibling as Node,
    };
  } else if (node instanceof DocumentFragment) {
    let parent: Node | null = null;
    let firstChild: Node | null = null;
    let lastChild: Node | null = null;
    const childNodes = node.__childNodes ?? [];
    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i];
      if (!parent) {
        const position = findDomParent(child);
        parent = position?.parent ?? null;
      }

      if (child instanceof HTMLElement) {
        if (!firstChild) {
          firstChild = child;
        }

        lastChild = child;
      }
    }

    domPosition = {
      parent,
      afterChild: firstChild?.previousSibling as Node,
      beforeChild: lastChild?.nextSibling as Node,
    };
  } else {
    domPosition = {
      parent: node.parentNode,
      afterChild: node.previousSibling,
      beforeChild: node.nextSibling,
    };
  }

  return domPosition;
}

// function removeTree(node?: Node | JSX.NodeOrNodes) {
//   if (!node) {
//     return;
//   } else if (Array.isArray(node)) {
//     for (const subNode of node) {
//       removeTree(subNode);
//     }
//   } else {
//     for (const child of node.__childNodes ?? []) {
//       removeTree(child);
//     }
//     node.parentNode?.removeChild(node);
//   }
// }

// function replaceChildren(
//   parent: Node,
//   before: Node | null,
//   toRender?: JSX.NodeOrNodesItem,
//   rendered?: JSX.NodeOrNodesItem
// ) {
//   if (toRender === rendered) {
//     return;
//   } else if (Array.isArray(toRender) && Array.isArray(rendered)) {
//     const length = Math.max(toRender.length, rendered.length);
//     for (let i = 0; i < length; i++) {
//       const childNode = toRender?.[i];
//       const renderedChild = rendered?.[i];
//       const nextChild = rendered?.[i + 1];
//       replaceChildren(parent, Array.isArray(nextChild) ? null : nextChild, childNode, renderedChild);
//     }
//   } else if (toRender instanceof Node && rendered instanceof Node && toRender !== rendered) {
//     parent.replaceChild(toRender, rendered);
//   } else if (toRender instanceof Node && !rendered) {
//     parent.insertBefore(toRender, before);
//   }
// }

// function reconcileNode(toRender: Node, rendered: Node) {
//   if (toRender instanceof Text && rendered instanceof Text) {
//     rendered.textContent = toRender.textContent;
//     return rendered;
//   }

//   const domPosition = findDomParent(rendered);
//   if (!domPosition?.parent) {
//     throw new Error("wtf");
//   }
//   const toRenderChildNodes = toRender.__childNodes ?? [];
//   const renderedChildNodes = rendered.__childNodes ?? [];
//   const childNodes = reconcileNodeOrNodes(toRenderChildNodes, renderedChildNodes);
//   replaceChildren(domPosition.parent, domPosition.beforeChild, childNodes, renderedChildNodes);

//   if (toRender instanceof DocumentFragment && rendered instanceof DocumentFragment) {
//     // rendered.__jsx!.childNodes = childNodes;
//     console.log();
//     return rendered;
//   }

//   if (toRender.nodeName === rendered.nodeName) {
//     setProps(rendered, toRender.__props, rendered.__props);
//     return rendered;
//   }

//   commit(toRender);
//   setProps(toRender, toRender.__props);
//   return toRender;
// }

// function reconcileNodeOrNodes(
//   toRender?: JSX.NodeOrNodesItem,
//   rendered?: JSX.NodeOrNodesItem
// ): JSX.NodeOrNodesItem | undefined {
//   if (!toRender && !rendered) {
//     return;
//   }

//   if (toRender instanceof Node && rendered instanceof Node) {
//     const node = reconcileNode(toRender, rendered);
//     return node;
//   }

//   if (Array.isArray(toRender) && Array.isArray(rendered)) {
//     const length = Math.max(toRender.length, rendered.length);
//     const nodes = [];
//     for (let i = 0; i < length; i++) {
//       const toRenderChild = toRender?.[i];
//       const renderedChild = rendered?.[i];
//       const node = reconcileNodeOrNodes(toRenderChild, renderedChild);
//       if (node) {
//         nodes.push(node);
//       }
//     }
//     return nodes;
//   }

//   // different
//   removeTree(rendered);
//   if (toRender instanceof Node) {
//     commit(toRender);
//     setProps(toRender, toRender.__props);
//     return toRender;
//   } else {
//     const nodes = [];
//     for (const node of toRender ?? []) {
//       const childNode = reconcileNodeOrNodes(node);
//       if (childNode) {
//         nodes.push(childNode);
//       }
//     }
//     return nodes;
//   }
// }

function useCurrentComponentState<T>(initialValue: T) {
  const renderedComponent = CURRENT_COMPONENT;
  if (!renderedComponent) {
    throw Error("useState: Unknown component to update.");
  }

  const index = renderedComponent.state.index;

  // setup initial value
  if (renderedComponent.state.values[index] == null) {
    renderedComponent.state.values[index] = initialValue;
  }

  const value = renderedComponent.state.values[index];

  // update state index
  renderedComponent.state.index++;

  const update = (nextValue: T, index: number) => {
    const { tag, props, state, node: renderedNode } = renderedComponent;
    const values = [...state.values];
    values[index] = nextValue;

    // render next component
    const node = document.createDocumentFragment();
    const component = renderComponent(node, tag, props, values);
    if (component.output) {
      node.__children = [component.output];
    }

    // TODO: reconcile new node with dom tree, as of right now
    // this just creates an entirely new tree and appends it to
    // the previous renders parent
    commit(node, renderedNode);
    const dom = findDomParent(renderedNode);
    dom?.parent?.appendChild(node);
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

type RecursiveArray<T> = Array<T | RecursiveArray<T>>;

declare global {
  interface Node {
    __children?: JSX.Child[];
    __childNodes?: Node[];
    __props?: JSX.Props;
  }

  namespace JSX {
    type Child = string | number | boolean | Node | Child[];

    // only used for typing JSX properly
    // most internal use cases are just JSX.Child[]
    type Children = Child | Child[];

    type Props = Record<string, unknown>;

    type PropsWithChildren = { children: Children };

    type ComponentProps = Props & PropsWithChildren;

    type ComponentFunction<T = any> = (props: ComponentProps & T) => Children;

    type ComponentRef = {
      node: Node;
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

    type Element = string | HTMLElement | DocumentFragment;

    type ElementType = keyof IntrinsicElements | ComponentFunction;
  }
}
