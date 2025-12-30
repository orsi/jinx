let CONTEXT_COMPONENT_REF: JSX.ComponentRef | undefined;

function renderComponent(
  tag: JSX.ComponentFunction,
  props: JSX.ComponentProps,
  stateValues: unknown[],
  jsxRef: JSX.Ref
): JSX.ComponentRef {
  const component: JSX.ComponentRef = {
    jsxRef,
    jsxChildren: [],
    props,
    render: undefined,
    state: {
      index: 0,
      values: stateValues ?? [],
    },
    tag,
  };

  const previousContext = CONTEXT_COMPONENT_REF;
  CONTEXT_COMPONENT_REF = component;
  component.render = tag(component.props);
  CONTEXT_COMPONENT_REF = previousContext;

  return component;
}

function renderChildNodes(children: JSX.Child[], parent: Node, previousChildNodes?: Node[]): Node[] {
  const nodes: Node[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    let previousChildNode = previousChildNodes?.[i];
    if (typeof child === "boolean") {
      // noop
    } else if (typeof child === "string" || typeof child === "number") {
      const previousTextNode = nodes[nodes.length - 1];
      if (previousTextNode && previousTextNode.nodeType === Node.TEXT_NODE) {
        previousTextNode.textContent += child.toString();
        continue;
      }

      if (
        previousChildNode &&
        previousChildNode.nodeType === Node.TEXT_NODE &&
        child !== previousChildNode.textContent
      ) {
        previousChildNode.textContent = child.toString();
      } else {
        previousChildNode = document.createTextNode(child.toString());
      }
      nodes.push(previousChildNode);
    } else if (child instanceof DocumentFragment) {
      nodes.push(...(child._jsxRef?.childNodes ?? []));
    } else if (child instanceof Node) {
      nodes.push(child);
    }
  }

  const childrenMaxLength = Math.max(nodes.length, previousChildNodes?.length ?? 0);
  for (let i = 0; i < childrenMaxLength; i++) {
    const attachedChildNode = previousChildNodes?.[i];

    let childNode: Node | undefined = nodes[i];
    if (!attachedChildNode && childNode) {
      parent.appendChild(childNode);
    } else if (attachedChildNode && childNode && attachedChildNode !== childNode) {
      parent.appendChild(childNode);
    } else {
      // console.log();
    }
  }

  return nodes;
}

function renderElement(tagName: string, props: JSX.Props, lastRender?: JSX.Ref) {
  const element = (lastRender?.node as HTMLElement) ?? document.createElement(tagName);
  const lastProps = lastRender?.args.props;

  // remove previous
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

  // set props
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

  return element;
}

export function jsx(tag: string | JSX.ComponentFunction, props: JSX.Props, ...children: JSX.Children): Node {
  const jsxRef: JSX.Ref = {
    args: {
      children,
      props,
      tag,
    },
    childNodes: [],
    componentRef: undefined,
    node: undefined,
  };
  CONTEXT_COMPONENT_REF?.jsxChildren.push(jsxRef);
  const lastRender = CONTEXT_COMPONENT_REF?.previous?.jsxChildren.shift();

  const flattenedChildren = children.flat();
  if (typeof tag === "function") {
    jsxRef.componentRef = renderComponent(tag, { ...props, children: flattenedChildren }, [], jsxRef);

    if (typeof jsxRef.componentRef.render === "boolean") {
      jsxRef.node = document.createComment("");
    } else if (jsxRef.componentRef.render instanceof Node) {
      jsxRef.node = jsxRef.componentRef.render;
    } else if (typeof jsxRef.componentRef.render === "string" || typeof jsxRef.componentRef.render === "number") {
      const textNode = document.createTextNode(jsxRef.componentRef.render.toString());
      jsxRef.node = textNode;
    } else if (Array.isArray(jsxRef.componentRef.render)) {
      jsxRef.node = lastRender?.node ?? document.createDocumentFragment();
      jsxRef.childNodes = renderChildNodes(jsxRef.componentRef.render, jsxRef.node, lastRender?.childNodes);
    } else {
      throw Error("Unknown component result");
    }
  } else {
    jsxRef.node = renderElement(tag, props, lastRender);
    jsxRef.childNodes = renderChildNodes(flattenedChildren, jsxRef.node, lastRender?.childNodes);
  }

  jsxRef.node._jsxRef = jsxRef;
  return jsxRef.node;
}

export function Fragment(props: { children: JSX.Children }) {
  return props.children;
}

export function useState<T>(initialValue: T extends Function ? never : T) {
  const lastComponentRef = CONTEXT_COMPONENT_REF;
  if (lastComponentRef == null) {
    throw Error("useState: Unknown component to update.");
  }

  let index = lastComponentRef.state.index;
  let currentValue = lastComponentRef.state.values[index];
  if (currentValue == null) {
    currentValue = lastComponentRef.state.values[index] = initialValue;
  }

  const set = (value: T extends Function ? (prev: T) => T : T) => {
    const t0 = performance.now();

    const stateValues = [...lastComponentRef.state.values];
    stateValues[index] = typeof value === "function" ? value(currentValue) : value;
    const component = {
      ...lastComponentRef,
      jsxChildren: [],
      previous: CONTEXT_COMPONENT_REF,
      state: {
        index: 0,
        values: stateValues,
      },
    };
    CONTEXT_COMPONENT_REF = component;
    component.render = component.tag(component.props);
    CONTEXT_COMPONENT_REF = undefined;

    const t1 = performance.now();
    console.log(`useState:${lastComponentRef.tag.name}: ${(t1 - t0).toFixed()}ms`);
  };

  lastComponentRef.state.index++;
  return [currentValue, set] as [T, (value: T | ((prev: T) => T)) => void];
}

export function useReducer<T>(reducer: (state: T, action: { type: string }) => T, initialValue: T) {
  const lastComponentRef = CONTEXT_COMPONENT_REF;
  if (lastComponentRef == null) {
    throw Error("useReducer: Unknown component to update.");
  }

  let index = lastComponentRef.state.index;
  let currentValue = lastComponentRef.state.values[index] as T;
  if (currentValue == null) {
    currentValue = lastComponentRef.state.values[index] = initialValue;
  }

  const dispatch = (action: { type: string }) => {
    const t0 = performance.now();
    const values = [...lastComponentRef.state.values];
    values[index] = reducer(currentValue, action);

    const component = {
      ...lastComponentRef,
      jsxChildren: [],
      previous: CONTEXT_COMPONENT_REF,
      state: {
        index: 0,
        values,
      },
    };
    CONTEXT_COMPONENT_REF = component;
    component.render = component.tag(component.props);
    CONTEXT_COMPONENT_REF = undefined;

    const t1 = performance.now();
    console.log(`useReducer update: ${(t1 - t0).toFixed()}ms`);
  };

  lastComponentRef.state.index++;
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
  interface Node {
    _jsxRef?: JSX.Ref;
  }

  namespace JSX {
    type Ref = {
      args: {
        children: JSX.Children;
        props: Props;
        tag: string | ComponentFunction;
      };
      childNodes: Node[];
      componentRef?: ComponentRef;
      node?: Node;
    };

    type Child = string | number | boolean | Node;

    type ChildOrChildArray = Child | Child[];

    type Children = ChildOrChildArray[];

    type RenderedChildren = Node[];

    type ChildrenProps = { children: Child | Child[] };

    type Props = Record<string, unknown> | null;

    type ComponentProps = Props & ChildrenProps;

    type ComponentFunction<T = any> = (props: Props & T) => ChildOrChildArray;

    type ComponentRef = {
      jsxRef: Ref;
      props: ComponentProps;
      render?: ReturnType<ComponentFunction>;
      state: {
        index: number;
        values: unknown[];
      };
      tag: ComponentFunction;
      jsxChildren: Ref[];
      previous?: ComponentRef;
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
