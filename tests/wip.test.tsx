import { expect, test } from "vitest";
import { useEffect, useReducer, useState } from "jinx";
import { page } from "vitest/browser";

test("state: updates on setting different state", async () => {
  let RenderOnDifferentStateTestState: any;
  const RenderOnDifferentStateTest = () => {
    RenderOnDifferentStateTestState = useState(1);
    return (
      <small>
        {RenderOnDifferentStateTestState[0]} ={">"} setState(2)
      </small>
    );
  };

  document.body.appendChild(<RenderOnDifferentStateTest />);

  const didUpdate = RenderOnDifferentStateTestState[1](2);
  await expect(didUpdate).toBe(true);
});

test("state: changes to null then back to value", async () => {
  let NullStateTestState: any;
  const NullStateTest = () => {
    NullStateTestState = useState(1);
    const [data] = NullStateTestState;
    return data;
  };

  const container = document.createElement("div");
  document.body.appendChild(<NullStateTest />);

  NullStateTestState[1](null);
  NullStateTestState[1](3);
  expect(container.childNodes[0]).toBeInstanceOf(Comment);
});

test("state: changes to undefined", async () => {
  let UndefinedStateTestState: any;
  const UndefinedStateTest = () => {
    UndefinedStateTestState = useState("hi");
    const [data] = UndefinedStateTestState;
    return data;
  };

  const container = document.createElement("div");
  document.body.appendChild(<UndefinedStateTest />);

  UndefinedStateTestState[1](undefined);
  expect(container.childNodes[0]).toBeInstanceOf(Comment);
});

test("jsx: css style object applied to element", async () => {
  document.body.appendChild(
    <div
      id="div"
      style={{
        backgroundColor: "red",
        fontSize: "72px",
        fontWeight: "900",
      }}
    >
      Yo
    </div>
  );

  const div = document.querySelector<HTMLDivElement>("#div")!;
  expect(div.style.backgroundColor).toBe("red");
  expect(div.style.fontSize).toBe("72px");
  expect(div.style.fontWeight).toBe("900");
});

test("state: update to 2 and isolated fragment stays in dom", async () => {
  let state: any;
  function Test({ children }: JSX.PropsWithChildren) {
    state = useState(0);
    const [count, setCount] = state;
    return (
      <>
        <button onClick={() => setCount(count + 1)}>Push me {count}</button>
        {children}
      </>
    );
  }

  document.body.appendChild(
    <Test>
      <>hi</>
    </Test>
  );

  state[1](2);
  await expect.element(page.getByText(/Push me 2/)).toBeInTheDocument();
  await expect.element(page.getByText("hi")).toBeInTheDocument();
});

test("state: nesting with awkward children", async () => {
  let testButtonState: any;
  const childText = "I'm a child";

  const OneMore = () => " ...hi";
  const NestedStuff = () => (
    <span>
      <OneMore />
    </span>
  );

  interface TestButton extends JSX.PropsWithChildren {
    message?: string;
  }
  const TestButton = ({ children, message }: TestButton) => {
    let [count, setCount] = (testButtonState = useState(1));
    return (
      <>
        <button onClick={() => setCount(++count)}>
          {children} {count}
        </button>
        <NestedStuff />
        <br />
        Count: {count} is {count % 2 === 0 ? "even" : <span>odd</span>}
        <br />
        <div id="bordered" style={{ border: "5px solid red" }}>
          <div>
            <div>yo</div>
          </div>
          {message}
        </div>
        {children}
      </>
    );
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(<TestButton message="hello">{childText}</TestButton>);

  testButtonState[1](2);
  expect(container.innerText).toContain("even");
  expect(container.childNodes[0]?.textContent).toContain(childText);
  expect(container.childNodes[9]?.textContent).toBe(childText);
});

test("fragments: isolated fragment renders", async () => {
  document.body.appendChild(<>Isolated Fragment</>);
  await expect.element(page.getByText("Isolated Fragment")).toBeInTheDocument();
});

test("reducer: toggles true to false", async () => {
  let reducer: any;
  const fakeReducer = (state: boolean, action: any) => {
    switch (action.type) {
      case "CHANGE":
        return !state;
      default:
        return state;
    }
  };

  const ReducerTest = () => {
    reducer = useReducer(fakeReducer, true);
    const [value] = reducer;
    return <div>{value.toString()}</div>;
  };

  document.body.appendChild(<ReducerTest />);

  reducer[1]({ type: "CHANGE" });
  await expect.element(page.getByText("false")).toBeInTheDocument();
});

test("component: returns array of mixed values", async () => {
  const Comp = () => [1, "hi", 2, 3, 4];
  document.body.appendChild(<Comp />);
  await expect.element(page.getByText("1hi234")).toBeInTheDocument();
});

test("component: returns array with conditional element", async () => {
  const Comp = () => [1, "hi", false ? <span>true</span> : <span>false</span>];
  document.body.appendChild(<Comp />);

  await expect.element(page.getByText(/1hi/)).toBeInTheDocument();
  const span = document.querySelector("span");
  expect(span).not.toBeNull();
  expect(span!.innerHTML).toContain("false");
});

test("component: returns string", async () => {
  const Comp = () => "hi";
  document.body.appendChild(<Comp />);
  await expect.element(page.getByText("hi")).toBeInTheDocument();
});

test("component: returns number", async () => {
  const Comp = () => 4;
  document.body.appendChild(<Comp />);
  await expect.element(page.getByText("4")).toBeInTheDocument();
});

test("component: returns true boolean, renders empty", async () => {
  const Comp = () => true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(<Comp />);
  expect(container.innerText).toBe("");
});

test("component: returns false boolean, renders empty", async () => {
  const Comp = () => false;
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(<Comp />);
  expect(container.innerText).toBe("");
});

test("jsx: conditional rendering and short-circuit expressions", async () => {
  document.body.appendChild(
    <>
      <h1 style={{ color: "green" }}>title</h1>
      {true && <marquee>true shortcircuit!</marquee>}
      {false && <marquee>false shortcircuit!</marquee>}
      {true ? <div>true tern!</div> : <div>false tern!</div>}
      {false ? <div>true tern!</div> : <div>false tern!</div>}
      {true && true}
      {false && false}
    </>
  );

  expect(document.querySelector("h1")).not.toBeNull();
  expect(document.querySelector("marquee")).not.toBeNull();
  expect(document.querySelector("marquee")!.innerText).toContain("true shortcircuit");
  expect(document.querySelector("div")).not.toBeNull();
  expect(document.querySelector("div")!.innerText).toContain("true tern!");
});

test("state: replace same element type on toggle", async () => {
  let ReplaceSameElementState: any;
  const ReplaceSameElement = () => {
    const [toggle] = (ReplaceSameElementState = useState(true));
    return toggle ? <div>hi</div> : <div>bye</div>;
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(<ReplaceSameElement />);

  ReplaceSameElementState[1]((value: boolean) => !value);
  expect(container.textContent).toBe("bye");
});

test("state: replace element with array on toggle", async () => {
  let ReplaceElementWithArrayState: any;
  const ReplaceElementWithArray = () => {
    const [toggle] = (ReplaceElementWithArrayState = useState(true));
    return toggle ? <div>hi</div> : ["good", "bye"];
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(<ReplaceElementWithArray />);

  ReplaceElementWithArrayState[1]((value: boolean) => !value);
  expect(container.textContent).toBe("goodbye");
});

test("state: replace array with element on toggle", async () => {
  let ReplaceArrayWithElementState: any;
  const ReplaceArrayWithElement = () => {
    const [toggle] = (ReplaceArrayWithElementState = useState(true));
    return toggle ? ["good", "bye"] : <div>hi</div>;
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(<ReplaceArrayWithElement />);

  ReplaceArrayWithElementState[1]((value: boolean) => !value);
  expect(container.textContent).toBe("hi");
});

test("state: replace different element type on toggle", async () => {
  let ReplaceDiffElementState: any;
  const ReplaceDifferentElement = () => {
    const [toggle, setToggle] = (ReplaceDiffElementState = useState(true));
    const swap = () => setToggle(!toggle);
    return toggle ? <div>hi</div> : <span>bye</span>;
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(<ReplaceDifferentElement />);

  ReplaceDiffElementState[1]((value: boolean) => !value);
  expect(container.textContent).toBe("bye");
});

test("state: children swap order", async () => {
  let ChildrenSwapState: any;
  const Swap = () => {
    const [data] = (ChildrenSwapState = useState(() => ["1", 2, "3", <span>4</span>]));
    return data;
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(<Swap />);

  ChildrenSwapState[1]((value: any[]) => {
    const next = [...value];
    next.push(next.shift()!);
    return next;
  });

  expect(container.firstChild?.textContent).toContain("2");
  expect(container.lastChild?.textContent).toContain("1");
});

test("state: children shrink to empty", async () => {
  let ChildrenShrinkingState: any;
  const ChildrenShrinking = () => {
    const [data] = (ChildrenShrinkingState = useState([1, 2, 3]));
    return (
      <>
        start
        {data.map((i) => i)}
        end
      </>
    );
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(<ChildrenShrinking />);

  expect(container.textContent).toBe("start123end");
  ChildrenShrinkingState[1]([]);
  expect(container.textContent).toBe("startend");
});

test("state: children grow from empty", async () => {
  let ChildrenGrowingState: any;
  const ChildrenGrowing = () => {
    const [data] = (ChildrenGrowingState = useState([]));
    return (
      <>
        start
        {data.map((i) => i)}
        end
      </>
    );
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  container.appendChild(<ChildrenGrowing />);

  expect(container.textContent).toBe("startend");
  ChildrenGrowingState[1]([1, 2, 3]);
  expect(container.textContent).toBe("start123end");
});

test("props: propagated correctly to child component", async () => {
  let PropsTestState: any;

  const Counter = ({ count }: { count: number }) => (
    <div id="counter">
      {count} is{` `}
      {count % 2 === 0 ? <small id="even">EVEN!</small> : <small id="odd">ODD!</small>}
    </div>
  );

  const PropsTest = () => {
    PropsTestState = useState(0);
    const [count] = PropsTestState;
    return <Counter count={count} />;
  };

  document.body.appendChild(<PropsTest />);

  PropsTestState[1](10);
  const counter = document.querySelector<HTMLElement>("#counter")!;
  expect(counter).not.toBeNull();
  expect(counter.innerText).toContain("10");
  expect(counter.innerText).toContain("EVEN!");
});

test("reducer: create rows via dispatch", async () => {
  let runCount = 0;
  const initialState = { data: [], selected: 0 } as {
    data: { id: number; label: string }[];
    selected: number;
  };

  const listReducer = (state: typeof initialState, action: any) => {
    runCount++;
    switch (action.type) {
      case "RUN":
        return {
          ...state,
          data: [...state.data, { id: state.data.length, label: `item-${state.data.length + 1}` }],
        };
      case "REMOVE": {
        const idx = state.data.findIndex((d: any) => d.id === action.id);
        return { data: [...state.data.slice(0, idx), ...state.data.slice(idx + 1)], selected: state.selected };
      }
      case "SELECT":
        return { ...state, selected: action.id };
      default:
        return state;
    }
  };

  const Row = ({ selected, item, dispatch }: any) => (
    <tr class={`row${selected ? " bg-danger" : ""}`}>
      <td class="col-md-1">{item.id}</td>
      <td class="col-md-4">
        <a onClick={() => dispatch({ type: "SELECT", id: item.id })}>{item.label}</a>
      </td>
      <td class="col-md-1">
        <a onClick={() => dispatch({ type: "REMOVE", id: item.id })}>
          <span class="glyphicon glyphicon-remove" aria-hidden="true" />
        </a>
      </td>
    </tr>
  );

  const CreateRowReducerTest = () => {
    const [{ data, selected }, dispatch] = useReducer(listReducer, initialState);
    return (
      <div id="container">
        <div class="row">
          <button id="run" onClick={() => dispatch({ type: "RUN" })}>
            Create 1 row
          </button>
        </div>
        {data.map((item) => (
          <Row item={item} selected={selected === item.id} dispatch={dispatch} />
        ))}
      </div>
    );
  };

  document.body.appendChild(<CreateRowReducerTest />);

  const button = document.querySelector<HTMLButtonElement>("#run")!;
  button.click();
  button.click();
  button.click();

  expect(document.querySelectorAll("tr.row")).toHaveLength(3);
  expect(runCount).toBe(3);
});

test("reducer: remove all rows via clear dispatch", async () => {
  let RemoveRowReducer: any;

  const RemoveRowReducerTest = () => {
    const [data, dispatch] = (RemoveRowReducer = useReducer(
      (state, action) => {
        switch (action.type) {
          case "CLEAR":
            return [];
          default:
            return state;
        }
      },
      [
        { id: 1, label: "item-1" },
        { id: 2, label: "item-2" },
      ]
    ));

    return (
      <div id="container">
        {data.map((item) => (
          <div id={`item-${item.id}`}>
            <div id={`item-nested-${item.id}`}>{item.id}</div>
          </div>
        ))}
        <div id="after">After</div>
        <button onClick={() => dispatch({ type: "CLEAR" })}>clear</button>
      </div>
    );
  };

  document.body.appendChild(<RemoveRowReducerTest />);

  RemoveRowReducer[1]({ type: "CLEAR" });
  expect(document.querySelector("#item-1")).toBeNull();
  expect(document.querySelector("#item-2")).toBeNull();
  expect(document.querySelector("#after")).not.toBeNull();
});

test("reducer: large list run and clear", async () => {
  let JSRuntimeReducer: any;
  const random = (max: number) => Math.round(Math.random() * 1000) % max;
  // prettier-ignore
  const A = ["pretty","large","big","small","tall","short","long","handsome","plain","quaint","clean","elegant","easy","angry","crazy","helpful","mushy","odd","unsightly","adorable","important","inexpensive","cheap","expensive","fancy"];
  // prettier-ignore
  const C = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
  // prettier-ignore
  const N = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];
  let nextId = 1;

  const buildData = (count: number) => {
    const data = new Array(count);
    for (let i = 0; i < count; i++) {
      data[i] = { id: nextId++, label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}` };
    }
    return data;
  };

  const initialState = { data: [], selected: 0 } as { data: ReturnType<typeof buildData>; selected: number };

  const listReducer = (state: typeof initialState, action: any) => {
    const { data, selected } = state;
    switch (action.type) {
      case "RUN":
        return { data: buildData(1000), selected: 0 };
      case "RUN_LOTS":
        return { data: buildData(10000), selected: 0 };
      case "ADD":
        return { data: data.concat(buildData(1000)), selected };
      case "UPDATE": {
        const newData = data.slice(0);
        for (let i = 0; i < newData.length; i += 10) {
          const r: any = newData[i];
          newData[i] = { id: r.id, label: r.label + " !!!" };
        }
        return { data: newData, selected };
      }
      case "CLEAR":
        return { data: [], selected: 0 };
      case "SWAP_ROWS": {
        const newdata: any = [...data];
        const d1 = newdata[0];
        const dn = newdata[newdata.length - 1];
        newdata[0] = dn;
        newdata[newdata.length - 1] = d1;
        return { data: newdata, selected };
      }
      case "REMOVE": {
        const idx = data.findIndex((d: any) => d.id === action.id);
        return { data: [...data.slice(0, idx), ...data.slice(idx + 1)], selected };
      }
      case "SELECT":
        return { data, selected: action.id };
      default:
        return state;
    }
  };

  const Row = ({ selected, item, dispatch }: any) => (
    <tr class={`row${selected ? " danger" : ""}`}>
      <td class="col-md-1">{item.id}</td>
      <td class="col-md-4">
        <a onClick={() => dispatch({ type: "SELECT", id: item.id })}>{item.label}</a>
      </td>
      <td class="col-md-1">
        <a onClick={() => dispatch({ type: "REMOVE", id: item.id })}>
          <span class="glyphicon glyphicon-remove" aria-hidden="true" />
        </a>
      </td>
      <td class="col-md-6" />
    </tr>
  );

  const Button = ({ id, cb, title }: any) => (
    <button type="button" class="btn btn-primary btn-block" id={id} onClick={cb}>
      {title}
    </button>
  );

  const Main = () => {
    JSRuntimeReducer = useReducer(listReducer, initialState);
    const [{ data, selected }, dispatch] = JSRuntimeReducer;
    return (
      <>
        <div class="jumbotron">
          <div id="header" class="row">
            <div class="col-md-6">
              <h1>JINX</h1>
            </div>
            <div class="col-md-6">
              <div class="row">
                <Button id="run" title="Create 1,000 rows" cb={() => dispatch({ type: "RUN" })} />
                <Button id="runlots" title="Create 10,000 rows" cb={() => dispatch({ type: "RUN_LOTS" })} />
                <Button id="add" title="Append 1,000 rows" cb={() => dispatch({ type: "ADD" })} />
                <Button id="update" title="Update every 10th row" cb={() => dispatch({ type: "UPDATE" })} />
                <Button id="clear" title="Clear" cb={() => dispatch({ type: "CLEAR" })} />
                <Button id="swaprows" title="Swap Rows" cb={() => dispatch({ type: "SWAP_ROWS" })} />
              </div>
            </div>
          </div>
        </div>
        <table class="table table-hover table-striped test-data">
          <tbody>
            {data.map((item: any) => (
              <Row item={item} selected={selected === item.id} dispatch={dispatch} />
            ))}
          </tbody>
        </table>
      </>
    );
  };

  document.body.appendChild(<Main />);

  JSRuntimeReducer[1]({ type: "RUN" });
  JSRuntimeReducer[1]({ type: "CLEAR" });
  expect(document.querySelector("#header")).not.toBeNull();
});

test("effect: runs after render into DOM", async () => {
  const UseEffectTest = () => {
    useEffect(() => {
      const el = document.querySelector<HTMLDivElement>("#use-effect-test");
      if (el) el.textContent = "hi";
    }, []);
    return <div id="use-effect-test">yo</div>;
  };

  document.body.appendChild(<UseEffectTest />);
  await expect.element(page.getByText("hi")).toBeInTheDocument();
});

test("effect: cleanup runs before each re-render", async () => {
  let cleanupCount = 0;
  let UseEffectCleanupTestState: any;

  const UseEffectCleanupTest = () => {
    UseEffectCleanupTestState = useState(0);
    useEffect(() => {
      return () => {
        cleanupCount++;
      };
    }, [UseEffectCleanupTestState[0]]);
    return (
      <div id="use-effect-cleanup-test">
        previous cleanupCount: {cleanupCount}
        <br />
        state: {UseEffectCleanupTestState[0]}
      </div>
    );
  };

  document.body.appendChild(<UseEffectCleanupTest />);

  UseEffectCleanupTestState[1](1);
  UseEffectCleanupTestState[1](2);
  UseEffectCleanupTestState[1](3);
  expect(UseEffectCleanupTestState[0]).toBe(3);
  expect(cleanupCount).toBe(3);
});

test("effect: cleanup runs on unmount", async () => {
  let effectRan = false;
  let effectCleanupUnmount = false;
  let UseEffectCleanupUnmountTestState: any;

  const First = () => {
    useEffect(() => {
      effectRan = true;
      return () => {
        effectCleanupUnmount = true;
      };
    }, []);
    return <div id="first">first</div>;
  };

  const UseEffectCleanupUnmountTest = () => {
    const [toggle, setToggle] = (UseEffectCleanupUnmountTestState = useState(false));
    return (
      <div id="use-effect-cleanup-unmount-test">
        {!toggle && <First />}
        {toggle && <div id="second">second</div>}
      </div>
    );
  };

  document.body.appendChild(<UseEffectCleanupUnmountTest />);

  UseEffectCleanupUnmountTestState[1](true);
  expect(effectRan).toBe(true);
  expect(effectCleanupUnmount).toBe(true);
});
