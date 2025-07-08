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
    render(element, target, previous) {
      currentApp = jinx;

      target = target ?? root;
      const t0 = performance.now();
      const renderRoot: RenderNode = {
        element,
        previous,
        target,
      };
      const stack: RenderNode[] = [renderRoot];
      while (stack.length > 0) {
        const current = stack.pop() as RenderNode;
        const { element, target, previous, renderNodes } = current;

        const _type = (current._type =
          typeof element === "boolean"
            ? "conditional"
            : typeof element === "string" || typeof element === "number"
            ? "text"
            : Array.isArray(element)
            ? "children"
            : typeof element === "object" && typeof element.tag === "string"
            ? "html"
            : typeof element === "object" && element.tag === Fragment
            ? "fragment"
            : "function");

        const _name = (current._name =
          typeof element === "boolean" || typeof element === "string" || typeof element === "number"
            ? `"${element}"`
            : Array.isArray(element)
            ? `[${element.map((n) => n?.tag?.name ?? n?.tag ?? n).join(", ")}]`
            : typeof element === "object" && typeof element.tag === "string"
            ? `<${element.tag}>`
            : typeof element === "object" && element.tag === Fragment
            ? `<>${element.children?.map((n) => n?.tag?.name ?? n?.tag ?? n).join(", ")}</>`
            : `<${element.tag?.name}{} />`);

        if (renderNodes) {
          current.childNodes = renderNodes.map((render) => render.node).filter((node): node is Node => node != null);
          const previousNodes = previous?.childNodes;

          const length = Math.max(current.childNodes.length, previousNodes?.length ?? 0);
          let i = 0;
          while (i < length) {
            const child = current.childNodes?.[i];
            if (child && current.node && current.node instanceof DocumentFragment && !target.contains(child)) {
              current.node.appendChild(child);
            } else if (child && current.node && current.node instanceof Element && !current.node.contains(child)) {
              current.node.appendChild(child);
            }

            const previousChild = previousNodes?.[i];
            if (previousChild && (child?.nodeType !== previousChild?.nodeType || (!child && previousChild))) {
              if (previousChild instanceof DocumentFragment) {
                const previousRenders = previous?.renderNodes?.[i];
                for (const remove of previousRenders?.childNodes ?? []) {
                  remove.parentNode?.removeChild(remove);
                }
              } else if (previousChild instanceof Element || previousChild instanceof Text) {
                previousChild.remove();
              }
            }
            i++;
          }
          continue;
        }

        let newTarget = target;
        let children: JinxElement[] | undefined;
        if (typeof element === "boolean") {
          // noop
          continue;
        } else if (typeof element === "string" || typeof element === "number") {
          // text
          if (previous?.node instanceof Text && element === previous?.element) {
            current.node = previous.node;
          } else if (previous?.node instanceof Text) {
            const text = element.toString();
            current.node = previous.node;
            current.node.textContent = text;
          } else {
            const text = element.toString();
            current.node = document.createTextNode(text);
          }
        } else if (Array.isArray(element)) {
          current.node = document.createDocumentFragment();
          children = element;
          stack.push(current);
        } else if (typeof element.tag === "string") {
          // html
          if (previous?.node instanceof HTMLElement && previous.node?.nodeName?.toLowerCase() === element.tag) {
            current.node = previous.node;
          } else if (previous?.node instanceof HTMLElement) {
            current.node = document.createElement(element.tag);
            while (previous.node.childNodes.length) {
              current.node.appendChild(previous.node.firstChild!);
            }
            previous.node.replaceWith(current.node);
          } else {
            current.node = document.createElement(element.tag);
          }

          newTarget = current.node;
          children = element.children;
          stack.push(current);

          // fix props
          const html = current.node as HTMLElement;
          const previousProps = (previous?.element as JSX.Element)?.props;
          for (const [prop, value] of Object.entries(previousProps ?? {})) {
            const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in html;
            if (isEvent) {
              const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
              html.removeEventListener(eventName, value as EventListenerOrEventListenerObject);
            } else {
              html.removeAttribute(prop);
            }
          }

          const currentProps = element.props ?? {};
          for (const [prop, value] of Object.entries(currentProps)) {
            const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in html;
            if (isEvent) {
              const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
              html.addEventListener(eventName, value as EventListenerOrEventListenerObject);
            } else if (prop === "style" && value != null && typeof value === "object") {
              for (const [styleProps, styleValue] of Object.entries(value)) {
                html.style.setProperty(styleProps, styleValue);
              }
            } else {
              html.setAttribute(prop, value as string);
            }
          }
        } else if (typeof element.tag === "function") {
          current.node = document.createDocumentFragment();
          jinx.setCurrent(current);

          const state: State = previous?.state ?? {
            values: [],
            index: 0,
          };
          current.state = state;
          element.props.children = element.children;
          const child = element.tag(element.props);
          current.state.index = 0;
          children = [child];
          stack.push(current);
        }

        // children stuff
        if (current.renderNodes == null) {
          current.renderNodes = [];
        }

        for (let i = 0; children && i < children.length; i++) {
          const child = children![i];
          const previousChild = previous?.renderNodes?.[i];

          const childNode = {
            element: child,
            previous: previousChild,
            parent: current,
            target: newTarget,
          };
          current.renderNodes.push(childNode);
          stack.push(childNode);
        }
      }

      if (renderRoot.node instanceof Node && !renderRoot.target.contains(renderRoot.node)) {
        renderRoot.target.appendChild(renderRoot.node);
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
  const { state, element: node, target } = render;
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
    app.render(node, target, render as RenderNode);
  };

  state.index++;

  return [value, set] as [T, (value: T) => void];
}

export function useReducer<S, A>(reducer: (state: S, action: A) => S, initialValue: S) {
  const app = getCurrentApp();
  const render = app.getCurrent();
  const { state, element: node, target } = render ?? {};
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
    app.render(node, target, render as RenderNode);
  };

  state.index++;

  return [value, dispatch] as [S, typeof dispatch];
}

export function jsx(tag: string | JSXFunction, props: any, ...children: JinxElement[]): JSX.Element {
  return {
    tag,
    props: props ?? {},
    children,
  };
}

export function Fragment(props: JSX.Element["props"] & { children: JinxElement }) {
  return props.children;
}

// damn this is an amazing hack
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type Jinx = {
  root: Element;
  currentRender?: RenderNode;
  render: (element: JinxElement, target?: Node, previous?: RenderNode) => void;
  setCurrent: (frame: RenderNode) => void;
  getCurrent: () => RenderNode | undefined;
};

interface State<S = any> {
  index: 0;
  values: S[];
}

type RenderNode = {
  element: JinxElement;
  target: Node;
  previous?: RenderNode;
  parent?: RenderNode;
  node?: Node;
  childNodes?: Node[];
  renderNodes?: RenderNode[];
  state?: State;
  _type?: "conditional" | "text" | "children" | "html" | "fragment" | "function";
  _name?: string;
};

type JinxElement = JSX.Element | string | number | boolean | JinxElement[];
type JSXFunction = (props?: any & { children?: JinxElement[] }) => JSX.Element;

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
      children: JinxElement[];
    };
    type ElementType = keyof IntrinsicElements | JSXFunction;

    interface ElementChildrenAttribute {
      children: {};
    }

    type IntrinsicElements = IntrinsicHTMLElementsMap;
  }
}
