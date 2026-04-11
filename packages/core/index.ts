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
    __props?: JSX.Props;
    __jinx?: JinxRef;
  }

  type JinxRef = {
    children: JSX.Child;
    root: Node | Node[];
    hooksIndex: number;
    hooks: JinxHook[];
    props: JSX.ComponentProps;
    tag: JSX.ComponentFunction;
  };

  type JinxHook<T = any> = {
    component: JinxRef;
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

    type Element = Node;

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
  current: JinxRef | undefined;
} = { current: undefined };

/**  Set of all Jinx components to be observed when inserted into the DOM. */
const JINX_COMPONENTS_SET = new Set<JinxRef>();

/**
 * A MutationObserver is only needed on the initial rendering into the DOM. Past that point,
 * we can rely on rerenderComponent to know when to run component life cycles.
 */
new MutationObserver(() => {
  for (const jinx of JINX_COMPONENTS_SET) {
    const isComponentInserted = !Array.isArray(jinx.root) || jinx.root.every((node) => document.contains(node));
    if (!isComponentInserted) {
      continue;
    }

    onRendered(jinx);
    JINX_COMPONENTS_SET.delete(jinx);
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
 * Returns a Node that can be inserted into the DOM.
 */
export function jsx(tag: string | JSX.ComponentFunction, props: JSX.Props, ...children: JSX.Child[]): Node {
  if (typeof tag === "string") {
    const node = document.createElement(tag);
    const childNodes = renderChildren(children);
    append(childNodes, node);
    return commit(node, props);
  } else {
    const jinx = renderComponent(tag, { ...props, children });

    let node = jinx.root;
    if (Array.isArray(node)) {
      const fragment = document.createDocumentFragment();
      for (const childNode of node) {
        if (!childNode.__jinx) {
          childNode.__jinx = jinx;
          JINX_COMPONENTS_SET.add(jinx);
        }

        fragment.appendChild(childNode);
      }

      fragment.__jinx = jinx;
      node = fragment;
    } else if (!node.__jinx) {
      node.__jinx = jinx;
      JINX_COMPONENTS_SET.add(jinx);
    }

    return node;
  }
}

/** JSX fragment. <></> */
export function Fragment(props: JSX.PropsWithChildren) {
  return props.children;
}

/** Renders a Jinx component. */
function renderComponent(tag: JSX.ComponentFunction, props: JSX.PropsWithChildren, hooks: JinxHook[] = []) {
  // save context
  const context = COMPONENT_REF.current;

  const jinx = {
    hooksIndex: 0,
    hooks,
    props,
    tag,
  } as JinxRef;

  // set current component context so that calls to `use` hooks have access
  COMPONENT_REF.current = jinx;

  jinx.children = tag(jinx.props);
  jinx.root = renderChildren(jinx.children);

  // restore context
  COMPONENT_REF.current = context;

  return jinx;
}

/** Renders Jinx children. */
function renderChildren(child: JSX.Child) {
  if (Array.isArray(child) && child.length > 0) {
    const childNodes: Node[] = [];
    for (const _child of child) {
      const childNode = renderChildren(_child);
      if (Array.isArray(childNode)) {
        childNodes.push(...childNode);
      } else {
        childNodes.push(childNode);
      }
    }
    return childNodes;
  } else if (child instanceof DocumentFragment) {
    return renderChildren(child.__jinx?.children);
  } else if (child instanceof Node) {
    return child;
  } else if (typeof child === "string" || typeof child === "number") {
    const text = child.toString();
    return document.createTextNode(text);
  } else {
    return document.createComment("");
  }
}

/** Runs effect hooks when component rendered. */
function onRendered(jinx?: JinxRef) {
  const effectHooks = jinx?.hooks?.filter((hook) => hook.type === "effect") ?? [];
  for (const hook of effectHooks) {
    const shouldRun =
      !hook.value.hasRunOnce ||
      hook.value.dependencies == null ||
      hook.value.dependencies.some((value: any, i: number) => {
        return !Object.is(value, hook.value.previousDependencies?.[i]);
      });
    if (shouldRun) {
      hook.value.result?.();
      hook.value.result = hook.value.effect?.();
      hook.value.hasRunOnce = true;
    }
  }
}

function onRemoved(jinx: JinxRef) {
  const effectHooks = jinx?.hooks?.filter((hook) => hook.type === "effect") ?? [];
  for (const hook of effectHooks) {
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
  } else {
    // update ref
    hook.component = component;
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
function rerenderComponent(previous: JinxRef) {
  if (!previous.root) {
    throw new Error("No previous component root to render.");
  }

  const t0 = performance.now();

  const next = renderComponent(previous.tag, previous.props, previous.hooks);
  next.root = reconcile(next.root, previous.root);

  if (Array.isArray(next.root)) {
    for (const childNode of next.root) {
      if (!childNode.__jinx) {
        childNode.__jinx = next;
      }
    }
  } else if (!next.root.__jinx) {
    next.root.__jinx = next;
  }
  onRendered(next);

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
    const reconciled: Node[] = [];
    for (let i = 0; i < length; i++) {
      const nextNode = next[i];
      const previousNode = previous[i];
      if (nextNode && previousNode) {
        const reconciledNode = reconcile(nextNode, previousNode);
        if (Array.isArray(reconciledNode)) {
          reconciled.push(...reconciledNode);
        } else {
          reconciled.push(reconciledNode);
        }
      } else if (nextNode) {
        const newNode = renderChildren(nextNode);
        if (Array.isArray(newNode)) {
          reconciled.push(...newNode);
        } else {
          reconciled.push(newNode);
        }
        append(newNode, parent);
      } else if (previousNode) {
        previousNode.parentNode?.removeChild(previousNode);
      }
    }
    return reconciled;
  } else if (previous instanceof Text && next instanceof Text) {
    previous.textContent = next.textContent;
    return previous;
  } else if (previous instanceof Node && next instanceof Node && previous.nodeName === next.nodeName) {
    const nextChildNodes = [...next.childNodes];
    const previousChildNodes = [...previous.childNodes];
    const length = Math.max(nextChildNodes.length, previousChildNodes.length);

    const reconciledChildNodes: Node[] = [];
    for (let i = 0; i < length; i++) {
      const nextChildNode = nextChildNodes[i];
      const previousChildNode = previousChildNodes[i];
      if (nextChildNode && previousChildNode) {
        const reconciledNode = reconcile(nextChildNode, previousChildNode);
        if (Array.isArray(reconciledNode)) {
          reconciledChildNodes.push(...reconciledNode);
        } else {
          reconciledChildNodes.push(reconciledNode);
        }
      } else if (nextChildNode) {
        const newNode = renderChildren(nextChildNode);
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

    const committed = commit(previous, next.__props);
    onRendered(next.__jinx);

    return committed;
  } else {
    const nodes = renderChildren(next);
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

/** Removes and applied props on an element. */
function commit(element: Node, next?: JSX.Props) {
  if (!(element instanceof HTMLElement)) {
    return element;
  }

  // remove previous
  for (const [prop, value] of Object.entries(element.__props ?? {})) {
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
  element.__props = next ?? {};

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
      onRemoved(previousNode.__jinx);
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
    for (const _child of child) {
      append(_child, parent);
    }
  } else {
    parent.appendChild(child);
  }
}
