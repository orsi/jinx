const instances: JinxRoot[] = [];
let currentApp: JinxRoot | undefined;

function getCurrentApp() {
  return currentApp!;
}

export function createRoot(target: HTMLElement | null) {
  if (!target) {
    throw Error("No target specified.");
  }

  const jinx: JinxRoot = {
    index: instances.length,
    target,
    frames: [],
    render: (element: Renderable | Renderable[], previous?: RenderFrame) => {
      currentApp = jinx;
      const rendering: RenderFrame = {
        jinx,
        tag: undefined,
        type: undefined,
        element,
        children: [],
        output: [],
        previous,
        target,
      };
      const t0 = performance.now();
      const rendered = render(rendering);

      for (const output of rendered.output) {
        target.append(output);
      }

      const t1 = performance.now();
      console.log(`render: ${t1 - t0} ms`);
      jinx.frames.push(rendered);
      return rendered;
    },
    update: (previous: RenderFrame) => {
      const t0 = performance.now();

      currentApp = jinx;
      const rendering: RenderFrame = {
        jinx,
        element: previous.element,
        children: [],
        output: [],
        previous,
        target: previous.target,
      };
      const rendered = render(rendering);

      jinx.frames.push(rendered);
      const t1 = performance.now();
      console.log(`update: ${t1 - t0} ms`);
      return rendered;
    },
    setCurrent(rendering: RenderFrame) {
      jinx._inProgress = rendering;
    },
    getCurrent() {
      return jinx._inProgress;
    },
  };
  instances.push(jinx);
  return jinx;
}

function render(rendering: RenderFrame) {
  let { jinx, target, previous, parent, output, children, element } = rendering;
  jinx.setCurrent(rendering);

  const isDifferentTarget = previous != null && previous?.target !== target;

  if (Array.isArray(element)) {
    // children

    console.log("isDiffTarget?", isDifferentTarget);
    const _children = element.filter((child) => typeof child !== "boolean").flat();
    for (const [i, child] of _children?.entries()) {
      const previousRender = previous?.children[i];
      const rendered = render({
        jinx,
        element: child,
        children: [],
        output: [],
        parent: rendering,
        target,
        previous: previousRender,
      });
      output.push(...rendered.output);
      children.push(rendered);

      const previousItem = previousRender?.output[0];
      const currentItem = rendered.output[0];

      if (previousItem === currentItem && !isDifferentTarget) {
        continue;
      } else if (previousItem == null || (previousItem === currentItem && isDifferentTarget)) {
        target.append(currentItem);
      } else if (currentItem == null) {
        previousItem.remove();
      } else if (previousItem !== currentItem) {
        previousItem.replaceWith(currentItem);
      }
    }

    if (previous?.output && previous.output.length > output.length) {
      const chopIndex = output.length;
      for (let i = chopIndex; i < previous.output.length; i++) {
        const _output = previous.output[i];
        _output.remove();
      }
    }
  } else if (typeof element === "string" || typeof element === "number") {
    // text

    let textNode = previous?.output?.[0];
    const isDifferent = textNode != null && textNode.nodeName.toLowerCase() !== "#text";
    if (textNode == null || isDifferent) {
      textNode = document.createTextNode(element.toString());
    } else if (textNode.textContent !== element) {
      textNode.textContent = element.toString();
    }
    output.push(textNode);
  } else if (typeof element === "object" && typeof element.tag === "string") {
    // html

    let previousOutput = previous?.output?.[0];
    let htmlElement: HTMLElement;
    if (previousOutput == null || previousOutput.nodeName.toLowerCase() !== element.tag) {
      htmlElement = document.createElement(element.tag);
    } else {
      htmlElement = previousOutput as HTMLElement;
    }

    output.push(htmlElement);

    if (element.children == null) {
      debugger;
    }
    if (element.props == null) {
      debugger;
    }

    // TODO: need to diff props from previous render
    for (const [prop, value] of Object.entries(element.props)) {
      const last = previous?.element?.props?.[prop];
      const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in htmlElement;

      if (isEvent) {
        const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
        htmlElement.removeEventListener(eventName, last as EventListenerOrEventListenerObject);
        htmlElement.addEventListener(eventName, value as EventListenerOrEventListenerObject);
      } else {
        htmlElement.setAttribute(prop, value as string);
      }
    }

    const childrenRender = render({
      jinx,
      children: [],
      element: element.children ?? [],
      output: [],
      parent: rendering,
      target: htmlElement,
      previous: previous?.children[0],
    });
    children.push(childrenRender);
  } else if (typeof element === "object" && typeof element.tag === "function") {
    // function

    let _element;
    if (element.tag === Fragment) {
      _element = element.children ?? [];
    } else {
      const props = {
        ...element.props,
        children: element.children,
      };

      rendering.state = previous?.state ?? [];
      rendering.stateIndex = 0;

      _element = element.tag(props);
    }

    const rendered = render({
      jinx,
      children: [],
      element: _element,
      output: [],
      parent: rendering,
      target,
      previous: previous?.children[0],
    });
    output.push(...rendered.output);
    children.push(rendered);
  }

  return rendering;
}

export function useState<T>(initialValue: T) {
  const app = getCurrentApp();
  const rendering = app.getCurrent();
  if (rendering == null) {
    throw Error("What the heck am I supposed to do now????");
  }

  let index = rendering.stateIndex;
  let state = rendering.state[index];
  if (state == null) {
    state = rendering.state[index] = initialValue;
  }

  const set = (value: T) => {
    rendering.state[index] = value;
    app.update(rendering);
  };

  rendering.stateIndex++;

  return [state, set] as [T, (value: T) => void];
}

export function useReducer<S, A>(reducer: (state: S, action: A) => S, initialValue: S) {
  const app = getCurrentApp();
  const rendering = app.getCurrent();
  if (rendering == null) {
    throw Error("What the heck am I supposed to do now????");
  }

  let index = rendering.stateIndex;
  let state = rendering.state[index];
  if (state == null) {
    state = rendering.state[index] = initialValue;
  }

  const dispatch = (action: A) => {
    rendering.state[index] = reducer(state, action);
    app.update(rendering);
  };

  // bump state index
  rendering.stateIndex++;

  return [state, dispatch] as [S, typeof dispatch];
}

export function jsx(
  tag: JSX.Element["tag"],
  props?: JSX.Element["props"],
  ...children: JSX.Element["children"]
): JSX.Element {
  return {
    tag,
    props: props ?? {},
    children,
  };
}

export function Fragment(props: any) {
  return props.children;
}

type JinxRoot = {
  index: number;
  target: Element;
  _inProgress?: RenderFrame;
  frames: RenderFrame[];
  render: (element: Renderable | Renderable[]) => RenderFrame;
  update: (previous: RenderFrame) => RenderFrame;
  setCurrent: (frame: RenderFrame) => void;
  getCurrent: () => RenderFrame | undefined;
};

interface RenderFrame<T = any> {
  jinx: JinxRoot;
  tag?: string;
  type?: string;
  children: RenderFrame[];
  target: Element;
  output: (HTMLElement | Text)[];
  element: Renderable | Renderable[];
  previous?: RenderFrame;
  parent?: RenderFrame<T>;
  stateIndex?: 0;
  state?: T[];
}

type Renderable = JSX.Element | string | number | boolean;

type JSXElementConstructor<P = any> = (props?: P) => Renderable | Renderable[];

interface JinxElement<T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>, P = any> {
  tag: T;
  props: P;
  children: Renderable[];
}

declare global {
  namespace JSX {
    type Element<
      T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>,
      P = any
    > = JinxElement<T, P>;
    type ElementType = string | JSXElementConstructor<any>;

    interface ElementChildrenAttribute {
      children: {};
    }

    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
