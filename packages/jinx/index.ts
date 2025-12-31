let CURRENT_COMPONENT: JSX.ComponentRef | undefined;

function renderComponent(
  tag: JSX.ComponentFunction,
  props: JSX.ComponentProps,
  stateValues: unknown[],
  jsxRef?: JSX.Ref,
  previous?: JSX.ComponentRef
): JSX.ComponentRef {
  const currentContext = CURRENT_COMPONENT;
  const component: JSX.ComponentRef = {
    jsxRef,
    jsxChildren: [],
    props,
    previous,
    render: undefined,
    state: {
      index: 0,
      values: stateValues,
    },
    tag,
  };

  CURRENT_COMPONENT = component;
  component.render = tag(component.props);
  CURRENT_COMPONENT = currentContext;

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
    component: undefined,
    node: undefined,
    previous: CURRENT_COMPONENT?.previous?.jsxChildren.shift(),
  };
  CURRENT_COMPONENT?.jsxChildren.push(jsxRef);

  const flattenedChildren = children.flat();
  if (typeof tag === "function") {
    jsxRef.component = renderComponent(
      tag,
      { ...props, children: flattenedChildren },
      jsxRef.previous?.component?.state.values ?? [],
      jsxRef,
      jsxRef.previous?.component
    );

    if (typeof jsxRef.component.render === "boolean") {
      jsxRef.node = document.createComment("");
    } else if (jsxRef.component.render instanceof Node) {
      jsxRef.node = jsxRef.component.render;
    } else if (typeof jsxRef.component.render === "string" || typeof jsxRef.component.render === "number") {
      const textNode = document.createTextNode(jsxRef.component.render.toString());
      jsxRef.node = textNode;
    } else if (Array.isArray(jsxRef.component.render)) {
      jsxRef.node = jsxRef.previous?.node ?? document.createDocumentFragment();
      jsxRef.childNodes = renderChildNodes(jsxRef.component.render, jsxRef.node, jsxRef.previous?.childNodes);
    } else {
      throw Error("Unknown component result");
    }
  } else {
    jsxRef.node = renderElement(tag, props, jsxRef.previous);
    jsxRef.childNodes = renderChildNodes(flattenedChildren, jsxRef.node, jsxRef.previous?.childNodes);
  }

  jsxRef.node._jsxRef = jsxRef;
  return jsxRef.node;
}

export function Fragment(props: { children: JSX.Children }) {
  return props.children;
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
    const values = [...component.state.values];
    values[index] = nextValue;
    renderComponent(component.tag, component.props, values, undefined, component);
  };

  return [value, index, update] as [T, number, (value: T, index: number) => void];
}

export function useState<T>(initialValue: T extends Function ? never : T) {
  const [value, index, update] = useCurrentComponentState(initialValue);

  const set = (_value: T extends Function ? (prev: T) => T : T) => {
    const nextValue = typeof _value === "function" ? _value(value) : _value;
    update(nextValue, index);
  };

  return [value, set] as [T, typeof set];
}

export function useReducer<T>(reducer: (state: T, action: { type: string }) => T, initialValue: T) {
  const [value, index, setter] = useCurrentComponentState(initialValue);

  const set = (action: { type: string }) => {
    const nextValue = reducer(value, action);
    setter(nextValue, index);
  };

  return [value, set] as [T, typeof set];
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
      component?: ComponentRef;
      node?: Node;
      previous?: JSX.Ref;
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
      jsxChildren: Ref[];
      jsxRef?: Ref;
      previous?: ComponentRef;
      props: ComponentProps;
      render?: ReturnType<ComponentFunction>;
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
