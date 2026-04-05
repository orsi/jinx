// TTTTTTTTTTTTTTTTTTTTTTTYYYYYYY       YYYYYYYPPPPPPPPPPPPPPPPP   EEEEEEEEEEEEEEEEEEEEEE   SSSSSSSSSSSSSSS
// T:::::::::::::::::::::TY:::::Y       Y:::::YP::::::::::::::::P  E::::::::::::::::::::E SS:::::::::::::::S
// T:::::::::::::::::::::TY:::::Y       Y:::::YP::::::PPPPPP:::::P E::::::::::::::::::::ES:::::SSSSSS::::::S
// T:::::TT:::::::TT:::::TY::::::Y     Y::::::YPP:::::P     P:::::PEE::::::EEEEEEEEE::::ES:::::S     SSSSSSS
// TTTTTT  T:::::T  TTTTTTYYY:::::Y   Y:::::YYY  P::::P     P:::::P  E:::::E       EEEEEES:::::S
//         T:::::T           Y:::::Y Y:::::Y     P::::P     P:::::P  E:::::E             S:::::S
//         T:::::T            Y:::::Y:::::Y      P::::PPPPPP:::::P   E::::::EEEEEEEEEE    S::::SSSS
//         T:::::T             Y:::::::::Y       P:::::::::::::PP    E:::::::::::::::E     SS::::::SSSSS
//         T:::::T              Y:::::::Y        P::::PPPPPPPPP      E:::::::::::::::E       SSS::::::::SS
//         T:::::T               Y:::::Y         P::::P              E::::::EEEEEEEEEE          SSSSSS::::S
//         T:::::T               Y:::::Y         P::::P              E:::::E                         S:::::S
//         T:::::T               Y:::::Y         P::::P              E:::::E       EEEEEE            S:::::S
//       TT:::::::TT             Y:::::Y       PP::::::PP          EE::::::EEEEEEEE:::::ESSSSSSS     S:::::S
//       T:::::::::T          YYYY:::::YYYY    P::::::::P          E::::::::::::::::::::ES::::::SSSSSS:::::S
//       T:::::::::T          Y:::::::::::Y    P::::::::P          E::::::::::::::::::::ES:::::::::::::::SS
//       TTTTTTTTTTT          YYYYYYYYYYYYY    PPPPPPPPPP          EEEEEEEEEEEEEEEEEEEEEE SSSSSSSSSSSSSSS

// this is an amazing hack
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

declare global {
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

  /**
   * When accessing the `style` property of an HTMLElement dynamically, typing
   * a string to `keyof CSSStyleDeclaration` doesn't work for some reason.
   * cf. https://github.com/microsoft/TypeScript/issues/17827#issuecomment-2008561761
   */
  type StyleProperty = Exclude<
    keyof Omit<
      CSSStyleDeclaration,
      "length" | "parentRule" | "getPropertyPriority" | "getPropertyValue" | "item" | "removeProperty" | "setProperty"
    >,
    number
  >;

  interface Window {
    __DEBUG__?: boolean;
  }

  // TODO: Attempt to avoid monkey patching Nodes
  interface Node {
    __jinx?: JinxRef;
    __jinxParent?: JinxRef;
  }

  type JinxComponentRef = {
    type: "component";
    childNodes: Node[];
    children?: JSX.Child;
    dom: Node | Node[];
    hooksIndex: number;
    hooks: JinxHook[];
    parentNode?: Node;
    props: JSX.ComponentProps;
    tag: JSX.ComponentFunction;
  };

  type JinxElementRef = {
    type: "element";
    childNodes: Node[];
    children?: JSX.Child;
    node: Node;
    parentNode?: Node;
    props: JSX.ComponentProps;
    tag: string;
  };

  type JinxRef = JinxComponentRef | JinxElementRef;

  type JinxHook<T = any> = {
    component: JinxComponentRef;
    index: number;
    initialValue: T;
    previousValue?: T;
    type: "effect" | "state";
    value?: T;
  };

  namespace JSX {
    type Child = null | undefined | string | number | boolean | Node | Child[];

    type Props = Record<string, unknown>;

    type PropsWithChildren = { children?: Child | Child[] };

    type ComponentProps = Props & PropsWithChildren;

    type ComponentFunction<T = any> = (props: ComponentProps & T) => Child | Child[];

    type IntrinsicElements = {
      [key in keyof HTMLElementTagNameMap]: IntrinsicHTMLElement<key>;
    } & {
      [key: string]: any;
    };

    type Element = string | HTMLElement | DocumentFragment;

    type ElementType = keyof IntrinsicElements | ComponentFunction;
  }
}

// SSSSSSSSSSSSSSS EEEEEEEEEEEEEEEEEEEEEETTTTTTTTTTTTTTTTTTTTTTTUUUUUUUU     UUUUUUUUPPPPPPPPPPPPPPPPP
// SS:::::::::::::::SE::::::::::::::::::::ET:::::::::::::::::::::TU::::::U     U::::::UP::::::::::::::::P
// S:::::SSSSSS::::::SE::::::::::::::::::::ET:::::::::::::::::::::TU::::::U     U::::::UP::::::PPPPPP:::::P
// S:::::S     SSSSSSSEE::::::EEEEEEEEE::::ET:::::TT:::::::TT:::::TUU:::::U     U:::::UUPP:::::P     P:::::P
// S:::::S              E:::::E       EEEEEETTTTTT  T:::::T  TTTTTT U:::::U     U:::::U   P::::P     P:::::P
// S:::::S              E:::::E                     T:::::T         U:::::D     D:::::U   P::::P     P:::::P
// S::::SSSS           E::::::EEEEEEEEEE           T:::::T         U:::::D     D:::::U   P::::PPPPPP:::::P
//  SS::::::SSSSS      E:::::::::::::::E           T:::::T         U:::::D     D:::::U   P:::::::::::::PP
//    SSS::::::::SS    E:::::::::::::::E           T:::::T         U:::::D     D:::::U   P::::PPPPPPPPP
//       SSSSSS::::S   E::::::EEEEEEEEEE           T:::::T         U:::::D     D:::::U   P::::P
//            S:::::S  E:::::E                     T:::::T         U:::::D     D:::::U   P::::P
//            S:::::S  E:::::E       EEEEEE        T:::::T         U::::::U   U::::::U   P::::P
// SSSSSSS     S:::::SEE::::::EEEEEEEE:::::E      TT:::::::TT       U:::::::UUU:::::::U PP::::::PP
// S::::::SSSSSS:::::SE::::::::::::::::::::E      T:::::::::T        UU:::::::::::::UU  P::::::::P
// S:::::::::::::::SS E::::::::::::::::::::E      T:::::::::T          UU:::::::::UU    P::::::::P
// SSSSSSSSSSSSSSS   EEEEEEEEEEEEEEEEEEEEEE      TTTTTTTTTTT            UUUUUUUUU      PPPPPPPPPP

/**
 * Current component rendering context. Enables hooks to have access to
 * their current component context.
 */
const COMPONENT_REF: {
  current: JinxComponentRef | undefined;
} = { current: undefined };

/**  Set of all Jinx rendered nodes. */
const JSX_NODES_SET = new Set<Node>();

/**
 * MutationObserver is only used on initial rendering into the dom. Past that point,
 * we can rely on rerenderComponent to know when to run component life cycles.
 */
new MutationObserver(() => {
  for (const node of JSX_NODES_SET) {
    const parent = node.__jinxParent;
    if (!parent || parent.type !== "component") {
      // this component does not determine any component mount lifecycle hooks
      JSX_NODES_SET.delete(node);
      continue;
    }

    const isComponentInserted =
      parent.dom === node || (Array.isArray(parent.dom) && parent.dom.every((node) => document.contains(node)));

    if (!isComponentInserted) {
      continue;
    }

    onRendered(parent as JinxComponentRef);
    JSX_NODES_SET.delete(node);
  }
}).observe(document.body, {
  childList: true,
  subtree: true,
});

// MMMMMMMM               MMMMMMMM               AAA               IIIIIIIIIINNNNNNNN        NNNNNNNN
// M:::::::M             M:::::::M              A:::A              I::::::::IN:::::::N       N::::::N
// M::::::::M           M::::::::M             A:::::A             I::::::::IN::::::::N      N::::::N
// M:::::::::M         M:::::::::M            A:::::::A            II::::::IIN:::::::::N     N::::::N
// M::::::::::M       M::::::::::M           A:::::::::A             I::::I  N::::::::::N    N::::::N
// M:::::::::::M     M:::::::::::M          A:::::A:::::A            I::::I  N:::::::::::N   N::::::N
// M:::::::M::::M   M::::M:::::::M         A:::::A A:::::A           I::::I  N:::::::N::::N  N::::::N
// M::::::M M::::M M::::M M::::::M        A:::::A   A:::::A          I::::I  N::::::N N::::N N::::::N
// M::::::M  M::::M::::M  M::::::M       A:::::A     A:::::A         I::::I  N::::::N  N::::N:::::::N
// M::::::M   M:::::::M   M::::::M      A:::::AAAAAAAAA:::::A        I::::I  N::::::N   N:::::::::::N
// M::::::M    M:::::M    M::::::M     A:::::::::::::::::::::A       I::::I  N::::::N    N::::::::::N
// M::::::M     MMMMM     M::::::M    A:::::AAAAAAAAAAAAA:::::A      I::::I  N::::::N     N:::::::::N
// M::::::M               M::::::M   A:::::A             A:::::A   II::::::IIN::::::N      N::::::::N
// M::::::M               M::::::M  A:::::A               A:::::A  I::::::::IN::::::N       N:::::::N
// M::::::M               M::::::M A:::::A                 A:::::A I::::::::IN::::::N        N::::::N
// MMMMMMMM               MMMMMMMMAAAAAAA                   AAAAAAAIIIIIIIIIINNNNNNNN         NNNNNNN

/**
 * Creates a node that can be inserted into the standard browser DOM apis such
 * as document.body.append().
 */
export function jsx(tag: string | JSX.ComponentFunction, props: JSX.Props, ...children: JSX.Child[]): Node {
  if (typeof tag === "string") {
    const jinx = renderElement(tag, props, children);

    const childNodes = renderChild(jinx.children);
    for (const childNode of Array.isArray(childNodes) ? childNodes : [childNodes]) {
      jinx.node.appendChild(childNode);
      jinx.childNodes.push(childNode);
      JSX_NODES_SET.add(childNode);
    }

    JSX_NODES_SET.add(jinx.node);
    return jinx.node;
  } else {
    const jinx = renderComponent(tag, { ...props, children });
    jinx.dom = renderChild(jinx.children);

    if (jinx.dom instanceof Node) {
      jinx.dom.__jinxParent = jinx;
      return jinx.dom;
    } else {
      const fragment = document.createDocumentFragment();

      for (const childNode of jinx.dom) {
        childNode.__jinxParent = jinx;
        fragment.appendChild(childNode);
        jinx.childNodes.push(childNode);
        JSX_NODES_SET.add(childNode);
      }

      fragment.__jinx = jinx;
      return fragment;
    }
  }
}

/** Renders a Jinx component. */
function renderComponent(tag: JSX.ComponentFunction, props: JSX.PropsWithChildren, hooks?: any[]) {
  // save context
  const context = COMPONENT_REF.current;

  const jinx = {
    type: "component",
    childNodes: [],
    dom: [],
    hooksIndex: 0,
    hooks: hooks ?? [],
    props,
    tag,
  } as JinxComponentRef;

  // set current component context so that calls to `use` hooks have access
  COMPONENT_REF.current = jinx;

  jinx.children = tag(jinx.props);

  // restore context
  COMPONENT_REF.current = context;

  return jinx;
}

/** Renders a Jinx element. */
function renderElement(tag: string, props: JSX.Props, children?: JSX.Child[]) {
  const jinx = {
    type: "element",
    childNodes: [],
    children,
    node: document.createElement(tag),
    props,
    tag,
  } as JinxElementRef;

  commit(jinx.node, jinx.props);

  jinx.node.__jinx = jinx;

  return jinx;
}

/** Renders a Jinx child. */
function renderChild(child: JSX.Child) {
  if (Array.isArray(child) && child.length > 0) {
    const childNodes: Node[] = [];
    for (const _child of child) {
      const childNode = renderChild(_child);
      if (Array.isArray(childNode)) {
        childNodes.push(...childNode);
      } else {
        childNodes.push(childNode);
      }
    }
    return childNodes;
  } else if (child instanceof DocumentFragment) {
    if (child.__jinx) {
      return renderChild(child.__jinx.children);
    } else {
      return [...child.childNodes] as Node[];
    }
  } else if (child instanceof Node) {
    return child;
  } else if (typeof child === "boolean") {
    const booleanNode = document.createComment(`${child}`);
    return booleanNode;
  } else if (typeof child === "string" || typeof child === "number") {
    const text = child.toString();
    const textNode = document.createTextNode(text);
    return textNode;
  } else {
    const commentNode = document.createComment("");
    return commentNode;
  }
}

/** JSX fragment. <></> */
export function Fragment(props: JSX.PropsWithChildren) {
  return props.children;
}

/** Runs effect hooks when component rendered. */
function onRendered(jinx: JinxComponentRef) {
  const effects = jinx.hooks?.filter((hook) => hook.type === "effect");
  for (const hook of effects ?? []) {
    const { dependencies, effect, hasRunOnce, previousDependencies, result } = hook.value;
    const shouldRun =
      !hasRunOnce ||
      dependencies == null ||
      dependencies.some((value: any, i: number) => {
        return !Object.is(value, previousDependencies?.[i]);
      });
    if (shouldRun) {
      result?.();
      hook.value.result = effect?.();
      hook.value.hasRunOnce = true;
    }
  }
}

function onRemoved(jinx: JinxComponentRef) {
  const effects = jinx.hooks?.filter((hook) => hook.type === "effect");
  for (const hook of effects ?? []) {
    hook.value?.result?.();
  }
}

/** Generic hook creation. */
function useHook<T>(type: JinxHook["type"], value: T) {
  const component = COMPONENT_REF.current;
  if (!component) {
    throw new Error("No component.");
  }

  const index = component.hooksIndex;
  let hook = component.hooks[index];
  if (!hook) {
    hook = component.hooks[index] = {
      component,
      index,
      initialValue: value,
      type,
      value,
    };
  }

  // advance hook index
  component.hooksIndex++;

  return hook;
}

export type EffectFunction = () => void | (() => void);

/** Runs each render. */
export function useEffect(effect: EffectFunction, dependencies?: unknown[]) {
  const hook = useHook("effect", {
    effect,
  });
  hook.value = {
    ...hook.value,
    effect,
    dependencies,
    previousDependencies: hook.value.dependencies,
  };
}

/** Returns state value and setter. */
export function useState<V>(initialValue: V | (() => V)) {
  const hook = useHook("state", initialValue instanceof Function ? initialValue() : initialValue);

  const set = (value: V | ((prev: V) => V)) => {
    const nextValue = value instanceof Function ? value(hook.value) : value;
    if (Object.is(nextValue, hook.value)) {
      // same value
      return false;
    }

    hook.value = nextValue;
    rerenderComponent(hook.component);
    return true;
  };

  return [hook.value, set] as [V, typeof set];
}

/** Reducer type. */
export type Reducer<S, A> = (state: S, action: A) => S;

/** Returns data and dispatch function. */
export function useReducer<S = any, A = any>(reducer: Reducer<S, A>, initialState: S, init?: (s: S) => S) {
  const hook = useHook("state", init != null ? init(initialState) : initialState);

  const set = (action: A) => {
    const nextValue = reducer(hook.value, action);
    if (Object.is(nextValue, hook.value)) {
      // same value
      return false;
    }

    hook.value = nextValue;
    rerenderComponent(hook.component);
    return true;
  };

  return [hook.value, set] as [S, typeof set];
}

// RRRRRRRRRRRRRRRRR   EEEEEEEEEEEEEEEEEEEEEENNNNNNNN        NNNNNNNNDDDDDDDDDDDDD      EEEEEEEEEEEEEEEEEEEEEERRRRRRRRRRRRRRRRR
// R::::::::::::::::R  E::::::::::::::::::::EN:::::::N       N::::::ND::::::::::::DDD   E::::::::::::::::::::ER::::::::::::::::R
// R::::::RRRRRR:::::R E::::::::::::::::::::EN::::::::N      N::::::ND:::::::::::::::DD E::::::::::::::::::::ER::::::RRRRRR:::::R
// RR:::::R     R:::::REE::::::EEEEEEEEE::::EN:::::::::N     N::::::NDDD:::::DDDDD:::::DEE::::::EEEEEEEEE::::ERR:::::R     R:::::R
//   R::::R     R:::::R  E:::::E       EEEEEEN::::::::::N    N::::::N  D:::::D    D:::::D E:::::E       EEEEEE  R::::R     R:::::R
//   R::::R     R:::::R  E:::::E             N:::::::::::N   N::::::N  D:::::D     D:::::DE:::::E               R::::R     R:::::R
//   R::::RRRRRR:::::R   E::::::EEEEEEEEEE   N:::::::N::::N  N::::::N  D:::::D     D:::::DE::::::EEEEEEEEEE     R::::RRRRRR:::::R
//   R:::::::::::::RR    E:::::::::::::::E   N::::::N N::::N N::::::N  D:::::D     D:::::DE:::::::::::::::E     R:::::::::::::RR
//   R::::RRRRRR:::::R   E:::::::::::::::E   N::::::N  N::::N:::::::N  D:::::D     D:::::DE:::::::::::::::E     R::::RRRRRR:::::R
//   R::::R     R:::::R  E::::::EEEEEEEEEE   N::::::N   N:::::::::::N  D:::::D     D:::::DE::::::EEEEEEEEEE     R::::R     R:::::R
//   R::::R     R:::::R  E:::::E             N::::::N    N::::::::::N  D:::::D     D:::::DE:::::E               R::::R     R:::::R
//   R::::R     R:::::R  E:::::E       EEEEEEN::::::N     N:::::::::N  D:::::D    D:::::D E:::::E       EEEEEE  R::::R     R:::::R
// RR:::::R     R:::::REE::::::EEEEEEEE:::::EN::::::N      N::::::::NDDD:::::DDDDD:::::DEE::::::EEEEEEEE:::::ERR:::::R     R:::::R
// R::::::R     R:::::RE::::::::::::::::::::EN::::::N       N:::::::ND:::::::::::::::DD E::::::::::::::::::::ER::::::R     R:::::R
// R::::::R     R:::::RE::::::::::::::::::::EN::::::N        N::::::ND::::::::::::DDD   E::::::::::::::::::::ER::::::R     R:::::R
// RRRRRRRR     RRRRRRREEEEEEEEEEEEEEEEEEEEEENNNNNNNN         NNNNNNNDDDDDDDDDDDDD      EEEEEEEEEEEEEEEEEEEEEERRRRRRRR     RRRRRRR

/** Rerenders a Jinx component. */
function rerenderComponent(previous: JinxComponentRef) {
  const t0 = performance.now();

  // save context
  const context = COMPONENT_REF.current;

  const next = {
    type: "component",
    childNodes: [],
    dom: [],
    hooksIndex: 0,
    hooks: previous.hooks ?? [],
    props: previous.props,
    tag: previous.tag,
  } as JinxComponentRef;

  // set current component context so that calls to `use` hooks have access
  COMPONENT_REF.current = next;

  next.children = next.tag(next.props);
  const dom = renderChild(next.children);
  const domPrevious = previous.dom;
  next.dom = reconcile(dom, domPrevious);
  if (Array.isArray(next.dom)) {
    next.childNodes.push(...next.dom);
  } else {
    next.dom.__jinxParent = next;
  }
  onRendered(next);

  // restore context
  COMPONENT_REF.current = context;

  if (window.__DEBUG__) {
    const t1 = performance.now();
    console.log(`${previous.tag.name} rerendered in ${t1 - t0}ms.`);
  }

  return previous;
}

/**
 * Reconciles two nodes if they are the same, otherwise it replaces all
 * previous nodes with the next.
 */
function reconcile(next: Node | Node[], previous: Node | Node[]) {
  if (Array.isArray(next) && Array.isArray(previous)) {
    const parent = previous.find((i) => i.parentNode != null)?.parentNode;
    if (!parent) {
      throw new Error("No parent.");
    }

    const length = Math.max(next.length, previous.length);
    const nodes: Node[] = [];
    for (let i = 0; i < length; i++) {
      const nextNode = next[i];
      const previousNode = previous[i];
      if (nextNode && previousNode) {
        const reconciledNode = reconcile(nextNode, previousNode);
        if (Array.isArray(reconciledNode)) {
          nodes.push(...reconciledNode);
        } else {
          nodes.push(reconciledNode);
        }
      } else if (nextNode) {
        const newNode = renderChild(nextNode);
        if (Array.isArray(newNode)) {
          nodes.push(...newNode);
        } else {
          nodes.push(newNode);
        }
        append(newNode, parent);
      } else if (previousNode) {
        previousNode.parentNode?.removeChild(previousNode);
      }
    }
    return nodes;
  } else if (previous instanceof Text && next instanceof Text) {
    previous.textContent = next.textContent;
    return previous;
  } else if (previous instanceof Node && next instanceof Node && previous.nodeName === next.nodeName) {
    const nextChildren = next.__jinx?.childNodes ?? [];
    const previousChildNodes = previous.__jinx?.childNodes ?? [];
    const length = Math.max(nextChildren.length, previousChildNodes.length);

    const reconciledChildNodes: Node[] = [];
    for (let i = 0; i < length; i++) {
      const nextChildNode = nextChildren[i];
      const previousChildNode = previousChildNodes[i];
      if (nextChildNode && previousChildNode) {
        const reconciledNode = reconcile(nextChildNode, previousChildNode);
        if (Array.isArray(reconciledNode)) {
          reconciledChildNodes.push(...reconciledNode);
        } else {
          reconciledChildNodes.push(reconciledNode);
        }
      } else if (nextChildNode) {
        const newNode = renderChild(nextChildNode);
        if (Array.isArray(newNode)) {
          reconciledChildNodes.push(...newNode);
        } else {
          reconciledChildNodes.push(newNode);
        }
        append(newNode, previous);
      } else if (previousChildNode) {
        previousChildNode.parentNode?.removeChild(previousChildNode);
      }
    }

    const committed = commit(previous, next.__jinx?.props ?? {}, previous.__jinx?.props);
    previous.__jinx = next.__jinx;
    if (next.__jinx) {
      next.__jinx.childNodes = reconciledChildNodes;
      onRendered(next.__jinx as JinxComponentRef);
    }
    return committed;
  } else {
    const nodes = renderChild(next);
    replace(previous, nodes);
    return nodes;
  }
}

// UUUUUUUU     UUUUUUUUTTTTTTTTTTTTTTTTTTTTTTTIIIIIIIIIILLLLLLLLLLL                SSSSSSSSSSSSSSS
// U::::::U     U::::::UT:::::::::::::::::::::TI::::::::IL:::::::::L              SS:::::::::::::::S
// U::::::U     U::::::UT:::::::::::::::::::::TI::::::::IL:::::::::L             S:::::SSSSSS::::::S
// UU:::::U     U:::::UUT:::::TT:::::::TT:::::TII::::::IILL:::::::LL             S:::::S     SSSSSSS
//  U:::::U     U:::::U TTTTTT  T:::::T  TTTTTT  I::::I    L:::::L               S:::::S
//  U:::::D     D:::::U         T:::::T          I::::I    L:::::L               S:::::S
//  U:::::D     D:::::U         T:::::T          I::::I    L:::::L                S::::SSSS
//  U:::::D     D:::::U         T:::::T          I::::I    L:::::L                 SS::::::SSSSS
//  U:::::D     D:::::U         T:::::T          I::::I    L:::::L                   SSS::::::::SS
//  U:::::D     D:::::U         T:::::T          I::::I    L:::::L                      SSSSSS::::S
//  U:::::D     D:::::U         T:::::T          I::::I    L:::::L                           S:::::S
//  U::::::U   U::::::U         T:::::T          I::::I    L:::::L         LLLLLL            S:::::S
//  U:::::::UUU:::::::U       TT:::::::TT      II::::::IILL:::::::LLLLLLLLL:::::LSSSSSSS     S:::::S
//   UU:::::::::::::UU        T:::::::::T      I::::::::IL::::::::::::::::::::::LS::::::SSSSSS:::::S
//     UU:::::::::UU          T:::::::::T      I::::::::IL::::::::::::::::::::::LS:::::::::::::::SS
//       UUUUUUUUU            TTTTTTTTTTT      IIIIIIIIIILLLLLLLLLLLLLLLLLLLLLLLL SSSSSSSSSSSSSSS

/** Applies next props on element. Removes previous props if given. */
function commit(element: Node, next?: JSX.Props, previous?: JSX.Props) {
  if (!(element instanceof HTMLElement)) {
    return element;
  }

  // remove previous
  for (const [prop, value] of Object.entries(previous ?? {})) {
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

  // apply next
  for (const [prop, value] of Object.entries(next ?? {})) {
    const isEvent = prop.startsWith("on") && prop.substring(2).toLowerCase() in element;
    if (isEvent) {
      const eventName = prop.substring(2).toLowerCase() as keyof ElementEventMap;
      element.addEventListener(eventName, value as EventListenerOrEventListenerObject);
    } else if (prop === "style" && value != null && typeof value === "object") {
      for (const [styleProp, styleValue] of Object.entries(value)) {
        // n.b. element.style.setProperty() does not support camelCase style objects like
        // backgroundColor, fontSize, etc., but using bracket notation does!
        element.style[styleProp as StyleProperty] = styleValue;
      }
    } else {
      element.setAttribute(prop, value as string);
    }
  }

  // transfer next props
  if (element.__jinx) {
    element.__jinx.props = next ?? {};
  }

  return element;
}

/** Replaces node or all nodes with new node/nodes. */
function replace(nodeOrNodes: Node | Node[], withNodes: Node | Node[]) {
  const parent = Array.isArray(nodeOrNodes)
    ? nodeOrNodes.find((i) => i.parentNode != null)?.parentNode
    : nodeOrNodes.parentNode;
  if (!parent) {
    throw new Error("No parent.");
  }

  const nodesToRemove = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes];

  // run any unmount effects
  for (const previousNode of nodesToRemove) {
    if (previousNode.__jinx) {
      onRemoved(previousNode.__jinx as JinxComponentRef);
    }

    if (previousNode.__jinxParent) {
      onRemoved(previousNode.__jinxParent as JinxComponentRef);
    }
  }

  const firstNode = nodesToRemove.shift();
  if (firstNode == null) {
    // nothing to do
    return;
  }

  if (Array.isArray(withNodes)) {
    for (const withNode of withNodes.reverse()) {
      // todo: really, a reverse?
      parent.insertBefore(withNode, firstNode.nextSibling);
    }
    parent.removeChild(firstNode);
  } else {
    parent.replaceChild(withNodes, firstNode);
  }

  let orphan = nodesToRemove.shift();
  while (orphan) {
    parent.removeChild(orphan);
    orphan = nodesToRemove.shift();
  }
}

/** Appends node or nodes into parent. */
function append(child: Node | Node[], parent?: Node | null) {
  if (!parent) {
    throw new Error("No parent");
  }

  if (Array.isArray(child)) {
    // TODO: this branch is never used?
    for (const _child of child) {
      append(_child, parent);
    }
  } else {
    parent.appendChild(child);
  }
}
