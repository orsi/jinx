let currentApp: Jinx | undefined;

function getCurrentApp() {
  if (currentApp == null) {
    throw Error("No current app");
  }
  return currentApp;
}

export function createRoot(root: HTMLElement) {
  if (!root) {
    throw Error("Target is undefined.");
  }

  const jinx: Jinx = {
    root,
    render(node, target, previous) {
      currentApp = jinx;

      target = target ?? root;
      const t0 = performance.now();
      const rendered: RenderedNode[] = [];
      const stack: ToRenderNode[] = [
        {
          node,
          previous,
          target,
        },
      ];

      while (stack.length > 0) {
        const current = stack.pop() as ToRenderNode;
        const { node, target, previous } = current;

        const type =
          typeof node === "boolean"
            ? "conditional"
            : typeof node === "string" || typeof node === "number"
            ? "text"
            : Array.isArray(node)
            ? "children"
            : typeof node === "object" && typeof node.tag === "string"
            ? "html"
            : typeof node === "object" && node.tag === Fragment
            ? "fragment"
            : "function";

        let parent = target;
        let children: JinxNode[] | undefined;
        let output: Node | undefined;
        if (typeof node === "boolean") {
          // noop
        } else if (typeof node === "string" || typeof node === "number") {
          // text
          const text = node.toString();

          let textNode = previous?.output;
          if (!textNode || textNode.textContent !== text) {
            textNode = document.createTextNode(text);
          }

          output = textNode;
        } else if (Array.isArray(node)) {
          children = node;
        } else if (node.tag === Fragment) {
          children = node.children;
        } else if (typeof node.tag === "function") {
          // functions
          const state: State = previous?.state ?? {
            values: [],
            index: 0,
          };
          current.state = state;
          jinx.setCurrent(current);

          node.props.children = node.children;
          const jsx = node.tag(node.props);
          current.state.index = 0;
          children = [jsx];
        } else if (typeof node.tag === "string") {
          // html
          const previousNode = previous?.output;
          let htmlElement: HTMLElement | undefined =
            previousNode instanceof HTMLElement && previousNode?.nodeName?.toLowerCase() === node.tag
              ? previousNode
              : undefined;
          if (htmlElement == null) {
            htmlElement = document.createElement(node.tag);
          }

          // TODO: Only update/remove/add props as needed
          if (previousNode) {
            const previousProps = (previous?.node as JSX.Element).props;
            for (const [prop, value] of Object.entries(previousProps ?? {})) {
              const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in htmlElement;
              if (isEvent) {
                const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
                htmlElement.removeEventListener(eventName, value as EventListenerOrEventListenerObject);
              } else {
                htmlElement.removeAttribute(prop);
              }
            }
          }

          const currentProps = node.props ?? {};
          for (const [prop, value] of Object.entries(currentProps)) {
            const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in htmlElement;
            if (isEvent) {
              const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
              // htmlElement.removeEventListener(eventName, last as EventListenerOrEventListenerObject);
              htmlElement.addEventListener(eventName, value as EventListenerOrEventListenerObject);
            } else if (prop === "style" && value != null && typeof value === "object") {
              for (const [styleProps, styleValue] of Object.entries(value)) {
                htmlElement.style.setProperty(styleProps, styleValue);
              }
            } else {
              htmlElement.setAttribute(prop, value as string);
            }
          }

          parent = htmlElement;
          output = htmlElement;
          children = node.children;
        }

        // children stuff
        current.type = type;
        current.output = output;
        const renderedNode: RenderedNode = { ...current, childNodes: [], type, output };
        if (children != null) {
          current.childNodes = children.map(
            (child, i) =>
              ({
                node: child,
                previous: previous?.childNodes?.[i],
                target: parent,
              } as ToRenderNode)
          );
          renderedNode.childNodes.push(...current.childNodes);
          stack.push(...renderedNode.childNodes);
        }

        rendered.push(renderedNode);
      }

      while (rendered.length > 0) {
        const render = rendered.pop() as RenderedNode;
        const previous = render.previous;

        if (render.type === "function") {
          // debugger;
        }

        if (render.type === "html" || render.type === "text") {
          const out = render.output;
          const last = render.previous?.output;
          if (previous && out && last && previous.type === render.type && previous.target === render.target) {
            last.parentNode?.replaceChild(out, last);
          } else if (out && !render.target.contains(out)) {
            render.target.append(out);
          } else {
            // debugger;
          }
        } else {
          // for (const child of render.childNodes as RenderedNode[]) {
          //   render.output.push(child.output);
          // }
        }

        // if (render.type !== previous?.type && previous?.output) {
        //   for (const out of previous?.output) {
        //     out.remove();
        //   }
        // }
        // remove previous children
        // const previousLength = previous?.renderedChildren?.length ?? 0;
        // for (let i = previousLength; i > renderedChildren.length; i--) {
        //   const previousChild = previous!.renderedChildren![i - 1];
        //   for (const item of previousChild.output) {
        //     item.remove();
        //   }
        // }
      }

      const t1 = performance.now();
      console.log(`render: ${t1 - t0} ms`);
    },
    setCurrent(rendering) {
      jinx.currentRender = rendering;
    },
    getCurrent() {
      return jinx.currentRender;
    },
  };
  return jinx;
}

export function useState<T>(initialValue: T) {
  const app = getCurrentApp();
  const render = app.getCurrent()!;
  const { state, node, target } = render;
  if (state == null || node == null || target == null) {
    throw Error("What the heck am I supposed to do now????");
  }

  let index = state.index;
  let value = state.values[index];
  if (value == null) {
    value = state.values[index] = initialValue;
  }

  const set = (value: T) => {
    state.values[index] = value;
    app.render(node, target, render as RenderedNode);
  };

  state.index++;

  return [value, set] as [T, (value: T) => void];
}

export function useReducer<S, A>(reducer: (state: S, action: A) => S, initialValue: S) {
  const app = getCurrentApp();
  const render = app.getCurrent();
  const { state, node, target } = render ?? {};
  if (state == null || node == null || target == null) {
    throw Error("What the heck am I supposed to do now????");
  }

  let index = state.index;
  let value = state.values[index];
  if (value == null) {
    value = state.values[index] = initialValue;
  }

  const dispatch = (action: A) => {
    state.values[index] = reducer(state.values[index], action);
    app.render(node, target, render as RenderedNode);
  };

  state.index++;

  return [value, dispatch] as [S, typeof dispatch];
}

export function jsx(tag: string | JSXFunction, props: any, ...children: JinxNode[]): JSX.Element {
  return {
    tag,
    props: props ?? {},
    children,
  };
}

export function Fragment(props: any) {
  return props.children;
}

// damn this is an amazing hack
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type Jinx = {
  root: Element;
  currentRender?: ToRenderNode;
  render: (element: JinxNode, target?: HTMLElement, previous?: RenderedNode) => void;
  setCurrent: (frame: ToRenderNode) => void;
  getCurrent: () => ToRenderNode | undefined;
};

interface State<S = any> {
  index: 0;
  values: S[];
}

type ToRenderNode = {
  node: JinxNode;
  target: HTMLElement;
  output?: Node;
  previous?: RenderedNode;
  childNodes?: ToRenderNode[];
  state?: State;
  type?: "conditional" | "text" | "children" | "html" | "fragment" | "function";
};

type RenderedNode = {
  node: JinxNode;
  output?: Node;
  childNodes: ToRenderNode[];
  target: HTMLElement;
  type: "conditional" | "text" | "children" | "html" | "fragment" | "function";
  previous?: RenderedNode;
  state?: State;
};

type JinxNode = JSX.Element | string | number | boolean | JinxNode[];
type JSXFunction = (props?: any & { children?: JinxNode[] }) => JSX.Element;

type IntrinsicHTMLElementsMap = {
  [key in keyof HTMLElementTagNameMap]: Prettify<
    Partial<Omit<HTMLElementTagNameMap[key], "style" | "class">> & {
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
};

declare global {
  namespace JSX {
    type Element = {
      tag: string | JSXFunction;
      props: any;
      children: JinxNode[];
    };
    type ElementType = keyof IntrinsicElements | JSXFunction;

    interface ElementChildrenAttribute {
      children: {};
    }

    type IntrinsicElements = IntrinsicHTMLElementsMap;
  }
}
