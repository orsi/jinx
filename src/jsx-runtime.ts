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
    cache: new Map(),
    render(element, previous) {
      currentApp = jinx;

      const t0 = performance.now();
      const rendered: Rendered[] = [];
      const stack: Rendered[] = [{ status: "in-progress", element, output: [], previous }];
      while (stack.length > 0) {
        let current = stack[stack.length - 1] as (typeof stack)[number];
        let { element, previous, status } = current;

        if (typeof element === "boolean") {
          stack.pop();
          continue;
        } else if (Array.isArray(element)) {
          stack.pop();
          stack.push(
            ...element.flat().map((child, i) => ({
              status: "in-progress" as "in-progress",
              element: child,
              output: [],
              previous: previous?.rendered?.[i],
            }))
          );
          continue;
        } else if (typeof element === "object" && element.tag === Fragment && status === "in-progress") {
          // fragment
          element.props.children = element.children;
          stack.push(
            ...element.children.flat().map((child, i) => ({
              status: "in-progress",
              element: child,
              output: [],
              previous: previous?.rendered?.[i],
            }))
          );
          current.status = "waiting";
          continue;
        } else if (typeof element === "object" && typeof element.tag === "function" && status === "in-progress") {
          // function
          const state: State = previous?.state ?? {
            values: [],
            index: 0,
          };
          current.state = state;
          jinx.setCurrent(current);

          element.props.children = element.children;
          const jsx = element.tag(element.props);
          current.state.index = 0;

          stack.push({
            status: "in-progress",
            element: jsx,
            output: [],
            previous: previous?.rendered?.[0],
          });
          current.status = "waiting";
          continue;
        } else if (typeof element === "object" && "children" in element && status === "in-progress") {
          stack.push(
            ...element.children.flat().map((child, i) => ({
              status: "in-progress",
              element: child,
              output: [],
              previous: previous?.rendered?.[i],
            }))
          );
          current.status = "waiting";
          continue;
        }

        // pop!
        stack.pop();

        if (typeof element === "string" || typeof element === "number") {
          // text
          const text = element.toString();
          const previousNode = previous?.output?.[0];
          const wasText = previousNode != null && previousNode.nodeName.toLowerCase() === "#text";

          let textNode;
          if (wasText) {
            textNode = previousNode as Text;
            textNode.textContent = text;
          } else if (previousNode != null && !wasText) {
            textNode = document.createTextNode(text);
            previousNode.replaceWith(textNode);
          } else {
            textNode = document.createTextNode(text);
          }

          current.output.push(textNode);
          rendered.push(current);
          continue;
        } else if (typeof element.tag === "string") {
          // html
          const previousDom = previous?.output[0];
          let htmlElement: HTMLElement;

          const isDifferent = previousDom != null && previousDom.nodeName.toLowerCase() !== element.tag;

          if (isDifferent) {
            htmlElement = document.createElement(element.tag);
            previousDom.replaceWith(htmlElement);
          } else if (previousDom == null) {
            htmlElement = document.createElement(element.tag);
          } else {
            htmlElement = previousDom as HTMLElement;
          }
          current.output.push(htmlElement);

          let previousProps: Record<string, unknown> | undefined;
          if (!Array.isArray(previous?.element) && typeof previous?.element === "object") {
            previousProps = previous.element.props;
            for (const [prop, value] of Object.entries(previous?.element.props ?? {})) {
              htmlElement.setAttribute(prop, "");
            }
          }

          const currentProps = element.props ?? {};
          for (const [prop, value] of Object.entries(currentProps)) {
            const last = previousProps?.[prop];
            const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in htmlElement;

            if (isEvent) {
              const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
              htmlElement.removeEventListener(eventName, last as EventListenerOrEventListenerObject);
              htmlElement.addEventListener(eventName, value as EventListenerOrEventListenerObject);
            } else if (prop === "style" && value != null && typeof value === "object") {
              for (const [styleProps, styleValue] of Object.entries(value)) {
                htmlElement.style.setProperty(styleProps, styleValue);
              }
            } else {
              htmlElement.setAttribute(prop, value as string);
            }
          }

          // eat children!
          let i = element.children?.length ?? 0;
          current.rendered = [];
          while (i > 0 && rendered.length > 0) {
            const renderedChild = rendered.pop();
            if (renderedChild == null) {
              debugger;
              throw Error("wtf");
            }
            current.rendered.push(renderedChild);
            htmlElement.append(...renderedChild.output);
            i--;
          }

          rendered.push(current);
          continue;
        } else if (element.tag === Fragment) {
          // eat children!
          let i = element.children?.length ?? 0;
          current.rendered = [];
          while (i > 0 && rendered.length > 0) {
            const renderedChild = rendered.pop();
            if (renderedChild == null) {
              debugger;
              throw Error("wtf");
            }
            current.rendered.push(renderedChild);
            current.output.push(...renderedChild.output);
            i--;
          }
          rendered.push(current);
        } else if (typeof element.tag === "function") {
          const renderedChild = rendered.pop();
          current.rendered = [];
          if (renderedChild == null) {
            debugger;
            throw Error("wtf");
          }
          current.rendered.push(renderedChild);
          current.output.push(...renderedChild.output);
          rendered.push(current);
          continue;
        } else {
          debugger;
          throw Error("You've reached a dead end...");
        }
      }

      let render = rendered.pop();
      while (render != null && previous == null) {
        root.append(...render.output);
        render = rendered.pop();
      }

      const t1 = performance.now();
      console.log(`render: ${t1 - t0} ms`);
    },
    setCurrent(rendering: Rendered) {
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
  const render = app.getCurrent();
  const { state, element } = render;
  if (state == null || element == null) {
    throw Error("What the heck am I supposed to do now????");
  }

  let index = state.index;
  let value = state.values[index];
  if (value == null) {
    value = state.values[index] = initialValue;
  }

  const set = (value: T) => {
    state.values[index] = value;
    app.render(element, render);
  };

  state.index++;

  return [value, set] as [T, (value: T) => void];
}

export function useReducer<S, A>(reducer: (state: S, action: A) => S, initialValue: S) {
  const app = getCurrentApp();
  const render = app.getCurrent();
  const { state, element } = render ?? {};
  if (state == null || element == null) {
    throw Error("What the heck am I supposed to do now????");
  }

  let index = state.index;
  let value = state.values[index];
  if (value == null) {
    value = state.values[index] = initialValue;
  }

  const dispatch = (action: A) => {
    state.values[index] = reducer(state, action);
    app.render(element, render);
  };

  state.index++;

  return [value, dispatch] as [S, typeof dispatch];
}

export function jsx(tag: string | JSXFunction, props: any, ...children: Renderable[]): JSX.Element {
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
  cache: Map<string, Rendered>;
  currentRender?: Rendered;
  render: (element: Renderable | Renderable[], previous?: Rendered) => void;
  setCurrent: (frame: Rendered) => void;
  getCurrent: () => Rendered | undefined;
};

interface State<S = any> {
  index: 0;
  values: S[];
}

interface Rendered<S = any> {
  element: Renderable | Renderable[];
  status: "in-progress" | "waiting" | "done";
  output: (HTMLElement | Text)[];
  previous?: Rendered<S>;
  children?: Renderable[];
  rendered?: Rendered<S> | Rendered<S>[];
  state?: State<S>;
}

type Renderable = JSX.Element | string | number | boolean;

type JSXFunction = (props?: any & { children?: Renderable[] }) => JSX.Element;

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
      children: Renderable[];
    };
    type ElementType = keyof IntrinsicElements | JSXFunction;

    interface ElementChildrenAttribute {
      children: {};
    }

    type IntrinsicElements = IntrinsicHTMLElementsMap;
  }
}
