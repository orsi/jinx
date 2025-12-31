import "./main.css";
import { useState, useReducer } from "jinx";

const TESTS: (() => { name: string; result?: boolean; hasResult: boolean })[] = [];

function runTests() {
  const $resultsContainer = document.createElement("div");
  $resultsContainer.style.margin = "16px 24px";
  $resultsContainer.style.paddingBottom = "16px";
  $resultsContainer.style.fontWeight = "700";

  const results = [];
  for (const test of TESTS) {
    const t = test();
    results.push(t);
    if (t.hasResult && !t.result) {
      const $testContainer = document.createElement("div");
      $testContainer.style.fontSize = "12px";
      $testContainer.style.color = "grey";
      $testContainer.style.margin = "16px 0px 0px 8px";
      $testContainer.textContent = t.name;
      $resultsContainer.append($testContainer);
    }
  }

  if (results.every((t) => !t.hasResult || t.result)) {
    $resultsContainer.style.color = "green";
    $resultsContainer.prepend("ALL TESTS PASSED");
  } else {
    $resultsContainer.style.color = "red";
    $resultsContainer.prepend("FAILED");
  }

  document.querySelector<HTMLDivElement>("body")!.prepend($resultsContainer);
}

function test(
  name: string,
  testFn: () => JSX.Element | JSX.ComponentFunction,
  testResultFn?: (container: HTMLElement) => boolean | undefined
) {
  const $testContainer = document.createElement("div");
  $testContainer.style.margin = "16px 24px";
  $testContainer.style.paddingBottom = "16px";
  $testContainer.style.borderBottom = "1px solid lightgrey";

  const $testHeader = document.createElement("h1");
  $testHeader.style.fontSize = "14px";
  $testHeader.style.margin = "16px 0px 0px";
  $testHeader.textContent = name;

  TESTS.push(() => {
    document.querySelector<HTMLDivElement>("body")!.append($testContainer);
    $testContainer.appendChild($testHeader);

    const TestResult = testFn();
    const $testResult = document.createElement("div");
    $testResult.style.margin = "16px 0px 0px 0px";
    $testResult.append(typeof TestResult === "function" ? <TestResult /> : TestResult);

    $testContainer.append($testResult);
    const result = testResultFn?.($testResult);
    if (result != null) {
      const $resultHeader = document.createElement("pre");
      $resultHeader.style.fontSize = "12px";
      $resultHeader.style.margin = "16px 0px 0px 0px";
      $resultHeader.textContent = `result: ${result}`;
      $testContainer.append($resultHeader);
    }

    return {
      name,
      result,
      hasResult: testResultFn != null,
    };
  });

  return {
    skip: () => {
      TESTS.pop();
    },
  };
}

const text = "Isolated Fragment";
test(
  "Isolated Fragment renders",
  () => {
    return <>{text}</>;
  },
  ($container) => {
    return $container.innerHTML.includes(text);
  }
);

let state: any;
test(
  "State update to 2 and isolated fragment stays in dom",
  () => {
    const IsolatedFragment = <>{text}</>;
    const Test = ({ children }: JSX.ChildrenProps) => {
      state = useState(0);
      const [count, setCount] = state;
      return (
        <>
          <button
            onClick={() => {
              console.log("hi", count);
              setCount(count + 1);
            }}
          >
            Push me {count}
          </button>
          <div>{children}</div>
        </>
      );
    };

    return <Test>{IsolatedFragment}</Test>;
  },
  ($container) => {
    state[1](2);
    return $container.innerHTML.includes("Push me 2") && $container.innerHTML.includes(text);
  }
);

let reducer: any;
test(
  "Reducer should change true to false",
  () => {
    const fakeReducer = (state: boolean, action: any) => {
      switch (action.type) {
        case "CHANGE":
          return action.value;
        default:
          return state;
      }
    };

    const ReducerTest = () => {
      reducer = useReducer(fakeReducer, true);
      const [value] = reducer;
      return <div>{value.toString()}</div>;
    };

    return <ReducerTest />;
  },
  ($container) => {
    reducer[1]({ type: "CHANGE", value: 25 });
    return $container.innerText.includes("25");
  }
);

test(
  "Component returns array",
  () => {
    return () => {
      return [1, "hi", 2, 3, 4];
    };
  },
  ($container) => {
    return $container.innerHTML.includes("1hi234");
  }
);

test(
  "Component returns array",
  () => {
    return () => {
      return [1, "hi", false ? <span>true</span> : <span>false</span>];
    };
  },
  ($container) => {
    const span = $container.querySelector("span");
    return $container.innerHTML.includes("1hi") && span != null && span.innerHTML.includes("false");
  }
);

test(
  "Component returns string",
  () => {
    return () => {
      return "hi";
    };
  },
  ($container) => {
    return $container.innerHTML.includes("hi");
  }
);

test(
  "Component returns 4",
  () => {
    return () => {
      return 4;
    };
  },
  ($container) => {
    return $container.innerHTML.includes("4");
  }
);

test(
  "Component returns true boolean, should be empty",
  () => {
    return () => {
      return true;
    };
  },
  ($container) => {
    return $container.innerText === "";
  }
);

test(
  "Component returns false boolean, should be empty",
  () => {
    return () => {
      return false;
    };
  },
  ($container) => {
    console.log($container.innerText);
    return $container.innerText === "";
  }
);

test(
  "Random test",
  () => {
    const RandomComponent = (
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
    return RandomComponent;
  },
  ($container) =>
    $container.querySelector("h1") != null &&
    $container.querySelector("marquee") != null &&
    $container.querySelector("marquee")!.innerText.includes("true shortcircuit") &&
    $container.querySelector("div") != null &&
    $container.querySelector("div")!.innerText.includes("true tern!")
);

let MyComponentState: any;
test(
  "Counter",
  () => {
    const Counter = ({ count }: { count: number }) => {
      return (
        <div id="count">count: {count}</div>
        // <>
        //   {count % 2 === 0 ? <small id="even">EVEN!</small> : <small id="odd">ODD!</small>}
        // </>
      );
    };

    const MyComponent = () => {
      MyComponentState = useState(0);
      const [count] = MyComponentState;
      return <Counter count={count} />;
    };

    return <MyComponent />;
  },
  ($container) => {
    MyComponentState[1](10);
    const $countContainer = $container.querySelector("#count") as HTMLElement;
    return $countContainer != null && $countContainer.innerText.includes("10");
  }
);

test(
  "Nesting",
  () => {
    const OneMore = () => " ...hi";

    const NestedStuff = () => (
      <span>
        <OneMore />
      </span>
    );

    interface TestButton extends JSX.ChildrenProps {
      hi?: string;
    }
    const TestButton = ({ children, hi }: TestButton) => {
      let [count, setCount] = useState(1);

      return (
        <>
          <button
            onClick={() => {
              setCount(++count);
            }}
          >
            {children} {count}
          </button>
          <NestedStuff />
          <br />
          Count: {count} is {count % 2 === 0 ? "even" : <span>odd</span>}
          <br />
          <div style={{ border: "5px solid red" }}>
            <div>
              <div>yo</div>
            </div>
          </div>
        </>
      );
    };

    return <TestButton hi="hello">I'm a child</TestButton>;
  },
  ($container) => $container.innerText.includes("...hi")
);

let ChildrenSwapState: any;
test(
  "ChildrenSwap",
  () => {
    const Swap = () => {
      const [data, setData] = (ChildrenSwapState = useState(() => ["1", 2, "3", <span>4</span>]));

      const swap = () => {
        setData((value) => {
          const next = [...value];
          next.push(next.shift()!);
          return next;
        });
      };

      return (
        <>
          <button onClick={swap}>Swap</button>

          <ul id="list">
            {data.map((item) => (
              <li>{item}</li>
            ))}
          </ul>
        </>
      );
    };
    return <Swap />;
  },
  ($container) => {
    ChildrenSwapState[1]((value: any[]) => {
      const next = [...value];
      next.push(next.shift()!);
      return next;
    });

    const $ul = $container.querySelector("#list");
    return $ul != null && $ul.firstChild?.textContent?.includes("2") && $ul.lastChild?.textContent?.includes("1");
  }
);

let JSRuntimeReducer: any;
test(
  "JSRuntimeTest",
  () => {
    const random = (max: number) => Math.round(Math.random() * 1000) % max;
    const A = [
      "pretty",
      "large",
      "big",
      "small",
      "tall",
      "short",
      "long",
      "handsome",
      "plain",
      "quaint",
      "clean",
      "elegant",
      "easy",
      "angry",
      "crazy",
      "helpful",
      "mushy",
      "odd",
      "unsightly",
      "adorable",
      "important",
      "inexpensive",
      "cheap",
      "expensive",
      "fancy",
    ];
    const C = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
    const N = [
      "table",
      "chair",
      "house",
      "bbq",
      "desk",
      "car",
      "pony",
      "cookie",
      "sandwich",
      "burger",
      "pizza",
      "mouse",
      "keyboard",
    ];

    let nextId = 1;

    const buildData = (
      count: number
    ): {
      id: number;
      label: string;
    }[] => {
      const data = new Array(count);

      for (let i = 0; i < count; i++) {
        data[i] = {
          id: nextId++,
          label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
        };
      }

      return data;
    };

    const initialState = { data: [], selected: 0 } as {
      data: ReturnType<typeof buildData>;
      selected: number;
    };

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
            const r = newData[i];

            newData[i] = { id: r.id, label: r.label + " !!!" };
          }

          return { data: newData, selected };
        }
        case "CLEAR":
          return { data: [], selected: 0 };
        case "SWAP_ROWS":
          const newdata = [...data];
          if (data.length > 998) {
            const d1 = newdata[1];
            const d998 = newdata[998];
            newdata[1] = d998;
            newdata[998] = d1;
          }
          return { data: newdata, selected };
        case "REMOVE": {
          const idx = data.findIndex((d: any) => d.id === action.id);

          return {
            data: [...data.slice(0, idx), ...data.slice(idx + 1)],
            selected,
          };
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
            <div class="row">
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

          <Button id="add" title="Append 1,000 rows" cb={() => dispatch({ type: "ADD" })} />

          <table class="table table-hover table-striped test-data">
            <tbody>
              {data.map((item: any) => (
                <Row item={item} selected={selected === item.id} dispatch={dispatch} />
              ))}
            </tbody>
          </table>
          <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true" />
        </>
      );
    };
    return <Main />;
  },
  ($container) => {
    JSRuntimeReducer[1]({ type: "RUN" });
    return $container.querySelector("tr.row") != null;
  }
);

runTests();
