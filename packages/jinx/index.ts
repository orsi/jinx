let currentElement: Node | undefined;

function renderChild(result: JSX.Child): Node {
  if (typeof result === "string" || typeof result === "number") {
    return document.createTextNode(result.toString());
  } else if (typeof result === "boolean") {
    return document.createElement("x-jinx");
  } else if (result instanceof Node) {
    return result;
  } else {
    const element = document.createElement("x-jinx");

    for (const child of result) {
      const childNode = renderChild(child);
      element.appendChild(childNode);
    }

    return element;
  }
}

export function jsx(tag: string, props: JSX.Props, ...children: JSX.Child[]): Node;
export function jsx(tag: JSX.Function, props: JSX.Props, ...children: JSX.Child[]): any;
export function jsx(tag: string | JSX.Function, props: JSX.Props, ...children: JSX.Child[]): Node | any {
  if (typeof tag === "function") {
    const element = document.createElement("x-jinx");
    element.__jinx = {
      props: props ?? {
        children: children ?? [],
      },
      tag,
      state: element?.__jinx?.state ?? {
        index: 0,
        values: [],
      },
    };

    // reset state tracking
    element.__jinx.state.index = 0;
    element.__jinx.props.children = children;
    currentElement = element;

    const result = tag(element.__jinx.props);
    const node = renderChild(result);

    for (const child of children) {
      const childNode = renderChild(child);
      node.appendChild(childNode);
    }

    element.appendChild(node);
    currentElement = undefined;
    return element;
  } else {
    const html = document.createElement(tag);
    const currentProps = props ?? {};
    for (const [prop, value] of Object.entries(currentProps)) {
      const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in html;
      if (isEvent) {
        const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
        html.addEventListener(eventName, value as EventListenerOrEventListenerObject);
      } else if (prop === "style" && value != null && typeof value === "object") {
        for (const [styleProp, styleValue] of Object.entries(value)) {
          html.style[styleProp as any] = styleValue;
          //                    ^ dirty, but I ain't figuring out how to type this
        }
      } else {
        html.setAttribute(prop, value as string);
      }
    }

    for (const child of children) {
      if (typeof child === "string" || typeof child === "number") {
        const text = document.createTextNode(child.toString());
        html.appendChild(text);
      } else if (child instanceof Node) {
        html.appendChild(child);
      }
    }

    return html;
  }
}

export function Fragment(props: Record<string, unknown> & { children: JSX.Child }) {
  return props.children;
}

export function useState<T>(initialValue: T extends Function ? never : T) {
  console.log("useState", initialValue, currentElement);
  const element = currentElement;
  if (element == null || element.__jinx == null || element.__jinx.state == null) {
    throw Error("What the heck am I supposed to do now????");
  }

  let index = element.__jinx.state.index;
  let currentValue = element.__jinx.state.values[index];
  if (currentValue == null) {
    currentValue = element.__jinx.state.values[index] = initialValue;
  }

  const set = (value: T extends Function ? (prev: T) => T : T) => {
    console.log("set: ", value, element.__jinx);
    if (element == null || element.__jinx == null || element.__jinx.state == null) {
      throw Error("What the heck am I supposed to do now????");
    }

    const newElement = document.createElement("x-jinx");
    newElement.__jinx = {
      props: element.__jinx.props,
      tag: element.__jinx.tag,
      state: { ...element.__jinx.state },
    };

    newElement.__jinx.state.values[index] = typeof value === "function" ? value?.(currentValue) : value;

    // reset state tracking
    newElement.__jinx.state.index = 0;
    currentElement = newElement;

    const result = newElement.__jinx.tag(element.__jinx.props);
    const node = renderChild(result);

    const children = newElement.__jinx.props?.children ?? [];
    for (const child of children) {
      const childNode = renderChild(child);
      node.appendChild(childNode);
    }

    newElement.appendChild(node);
    currentElement = undefined;

    console.log("update", newElement, element);
    element.parentElement?.replaceChild(newElement, element);
  };

  element.__jinx.state.index++;

  return [currentValue, set] as [T, (value: T | ((prev: T) => T)) => void];
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
  // augment HTML Node
  interface Node {
    __jinx: {
      props: Record<string, unknown> & { children: JSX.Child[] };
      tag: JSX.Function;
      target?: Node;
      state: {
        index: number;
        values: unknown[];
      };
    };
  }

  namespace JSX {
    type IntrinsicElements = {
      [key in keyof HTMLElementTagNameMap]: IntrinsicHTMLElement<key>;
    } & {
      [key: string]: any;
    };

    type Child = string | number | boolean | Node | Child[];

    interface ElementChildrenAttribute {
      children: {};
    }

    type Element = string | Node;

    type ElementType = keyof IntrinsicElements | Function;

    type Function<T = any> = (props: { children?: Child[] } & T) => Child;

    type Props = Record<string, unknown> & { children: JSX.Child[] };
  }
}
