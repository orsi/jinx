import "./main.css";
import { useState, useReducer, Reducer } from "jinx";

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
  $testContainer.id = `test-${name.toLocaleLowerCase().replace(/ /g, "-")}`;
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
    $testResult.id = `test-result-${name.toLocaleLowerCase().replace(/ /g, "-")}`;
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
/// BAD TESTS

let state: any;
test(
  "State update to 2 and isolated fragment stays in dom",
  () => {
    const Test = ({ children }: JSX.PropsWithChildren) => {
      state = useState(0);
      const [count, setCount] = state;

      return (
        <>
          <button
            onClick={() => {
              const nextCount = count + 1;
              console.log("nextCount", nextCount);
              setCount(nextCount);
            }}
          >
            Push me {count}
          </button>
          {children}
        </>
      );
    };

    return (
      <Test>
        <>hi</>
      </Test>
    );
  },
  ($container) => {
    state[1](2);
    return $container.innerHTML.includes("Push me 2") && $container.innerHTML.includes("hi");
  }
);

// let MyComponentState: any;
// test(
//   "Counter",
//   () => {
//     const Counter = ({ count }: { count: number }) => {
//       return (
//         <div id="count">
//           count: {count}
//           {count % 2 === 0 ? <small id="even"> EVEN!</small> : <small id="odd"> ODD!</small>}
//         </div>
//       );
//     };

//     const MyComponent = () => {
//       MyComponentState = useState(0);
//       const [count] = MyComponentState;
//       return <Counter count={count} />;
//     };

//     return <MyComponent />;
//   },
//   ($container) => {
//     MyComponentState[1](10);
//     const $countContainer = $container.querySelector("#count") as HTMLElement;
//     return (
//       $countContainer != null && $countContainer.innerText.includes("10") && $countContainer.innerText.includes("EVEN!")
//     );
//   }
// );

// let testButtonState: any;
// test(
//   "Nesting with awkward child test",
//   () => {
//     const OneMore = () => " ...hi";

//     const NestedStuff = () => (
//       <span>
//         <OneMore />
//       </span>
//     );

//     interface TestButton extends JSX.PropsWithChildren {
//       hi?: string;
//     }
//     const TestButton = ({ children, hi }: TestButton) => {
//       let [count, setCount] = (testButtonState = useState(1));

//       return (
//         <>
//           <button
//             onClick={() => {
//               setCount(++count);
//             }}
//           >
//             {children} {count}
//           </button>
//           <NestedStuff />
//           <br />
//           Count: {count} is {count % 2 === 0 ? "even" : <span>odd</span>}
//           <br />
//           <div id="bordered" style={{ border: "5px solid red" }}>
//             <div>
//               <div>yo</div>
//             </div>
//           </div>
//         </>
//       );
//     };

//     return <TestButton hi="hello">I'm a child</TestButton>;
//   },
//   ($container) => {
//     testButtonState[1](2);
//     const awkwardChild = $container.childNodes[6];
//     return $container.innerText.includes("...hi") && awkwardChild == null;
//   }
// );

/// GOOD TESTS
// test(
//   "Isolated Fragment renders",
//   () => {
//     return <>Isolated Fragment</>;
//   },
//   ($container) => {
//     return $container.innerHTML.includes("Isolated Fragment");
//   }
// );

// let reducer: any;
// test(
//   "Reducer should change true to false",
//   () => {
//     const fakeReducer = (state: boolean, action: any) => {
//       switch (action.type) {
//         case "CHANGE":
//           return !state;
//         default:
//           return state;
//       }
//     };

//     const ReducerTest = () => {
//       reducer = useReducer(fakeReducer, true);
//       const [value] = reducer;
//       return <div>{value.toString()}</div>;
//     };

//     return <ReducerTest />;
//   },
//   ($container) => {
//     reducer[1]({ type: "CHANGE" });
//     return $container.innerText.includes("false");
//   }
// );

// test(
//   "Component returns array",
//   () => {
//     return () => {
//       return [1, "hi", 2, 3, 4];
//     };
//   },
//   ($container) => {
//     return $container.innerHTML.includes("1hi234");
//   }
// );

// test(
//   "Component returns array",
//   () => {
//     return () => {
//       return [1, "hi", false ? <span>true</span> : <span>false</span>];
//     };
//   },
//   ($container) => {
//     const span = $container.querySelector("span");
//     return $container.innerHTML.includes("1hi") && span != null && span.innerHTML.includes("false");
//   }
// );

// test(
//   "Component returns string",
//   () => {
//     return () => {
//       return "hi";
//     };
//   },
//   ($container) => {
//     return $container.innerHTML.includes("hi");
//   }
// );

// test(
//   "Component returns 4",
//   () => {
//     return () => {
//       return 4;
//     };
//   },
//   ($container) => {
//     return $container.innerHTML.includes("4");
//   }
// );

// test(
//   "Component returns true boolean, should be empty",
//   () => {
//     return () => {
//       return true;
//     };
//   },
//   ($container) => {
//     return $container.innerText === "";
//   }
// );

// test(
//   "Component returns false boolean, should be empty",
//   () => {
//     return () => {
//       return false;
//     };
//   },
//   ($container) => {
//     console.log($container.innerText);
//     return $container.innerText === "";
//   }
// );

// test(
//   "Random test",
//   () => {
//     const RandomComponent = (
//       <>
//         <h1 style={{ color: "green" }}>title</h1>
//         {true && <marquee>true shortcircuit!</marquee>}
//         {false && <marquee>false shortcircuit!</marquee>}
//         {true ? <div>true tern!</div> : <div>false tern!</div>}
//         {false ? <div>true tern!</div> : <div>false tern!</div>}
//         {true && true}
//         {false && false}
//       </>
//     );
//     return RandomComponent;
//   },
//   ($container) =>
//     $container.querySelector("h1") != null &&
//     $container.querySelector("marquee") != null &&
//     $container.querySelector("marquee")!.innerText.includes("true shortcircuit") &&
//     $container.querySelector("div") != null &&
//     $container.querySelector("div")!.innerText.includes("true tern!")
// );

// let ReplaceSameElementState: any;
// test(
//   "ReplaceSameElement",
//   () => {
//     const ReplaceSameElement = () => {
//       const [toggle, setToggle] = (ReplaceSameElementState = useState(true));

//       return toggle ? (
//         <button onClick={() => console.log("hi")}>hi</button>
//       ) : (
//         <button onClick={() => console.log("bye")}>bye</button>
//       );
//     };
//     return <ReplaceSameElement />;
//   },
//   ($container) => {
//     ReplaceSameElementState[1]((value: boolean) => !value);
//     return $container.textContent === "bye";
//   }
// );

// let ReplaceElementWithArrayState: any;
// test(
//   "ReplaceElementWithArray",
//   () => {
//     const ReplaceElementWithArray = () => {
//       const [toggle] = (ReplaceElementWithArrayState = useState(true));

//       return toggle ? <button onClick={() => console.log("hi")}>hi</button> : ["good", "bye"];
//     };
//     return <ReplaceElementWithArray />;
//   },
//   ($container) => {
//     ReplaceElementWithArrayState[1]((value: boolean) => !value);
//     return $container.textContent === "goodbye";
//   }
// );

// let ReplaceArrayWithElementState: any;
// test(
//   "ReplaceArrayWithElement",
//   () => {
//     const ReplaceArrayWithElement = () => {
//       const [toggle] = (ReplaceArrayWithElementState = useState(true));

//       return toggle ? ["good", "bye"] : <button onClick={() => console.log("hi")}>hi</button>;
//     };
//     return <ReplaceArrayWithElement />;
//   },
//   ($container) => {
//     ReplaceArrayWithElementState[1]((value: boolean) => !value);
//     return $container.textContent === "hi";
//   }
// );

// let ReplaceDiffElementState: any;
// test(
//   "ReplaceDifferentElement",
//   () => {
//     const ReplaceDifferentElement = () => {
//       const [toggle, setToggle] = (ReplaceDiffElementState = useState(true));

//       const swap = () => {
//         setToggle(!toggle);
//       };

//       return toggle ? <div>hi</div> : <span>bye</span>;
//     };
//     return <ReplaceDifferentElement />;
//   },
//   ($container) => {
//     ReplaceDiffElementState[1]((value: boolean) => !value);
//     return $container.textContent === "bye";
//   }
// );

// let ChildrenSwapState: any;
// test(
//   "ChildrenSwap",
//   () => {
//     const Swap = () => {
//       const [data] = (ChildrenSwapState = useState(() => ["1", 2, "3", <span>4</span>]));
//       return data;
//     };
//     return <Swap />;
//   },
//   ($container) => {
//     ChildrenSwapState[1]((value: any[]) => {
//       const next = [...value];
//       next.push(next.shift()!);
//       return next;
//     });

//     return $container.firstChild?.textContent?.includes("2") && $container.lastChild?.textContent?.includes("1");
//   }
// );

// let ChildrenShrinkingState: any;
// test(
//   "ChildrenShrinking",
//   () => {
//     const ChildrenShrinking = () => {
//       const [data] = (ChildrenShrinkingState = useState([1, 2, 3]));
//       return (
//         <>
//           <div id="start">start</div>
//           {data.map((i) => (
//             <span id={`item-${i}`}>a. {i}, </span>
//           ))}
//           <div id="end">end</div>
//         </>
//       );
//     };
//     return <ChildrenShrinking />;
//   },
//   ($container) => {
//     ChildrenShrinkingState[1]([]);
//     return $container.childNodes[2]?.textContent?.includes("end");
//   }
// );

// let ChildrenGrowingState: any;
// test(
//   "ChildrenGrowing",
//   () => {
//     const ChildrenGrowing = () => {
//       const [data] = (ChildrenGrowingState = useState([]));
//       return (
//         <>
//           <div id="start">start</div>
//           {data.map((i) => (
//             <span id={`item-${i}`}>a. {i}, </span>
//           ))}
//           <div id="end">end</div>
//         </>
//       );
//     };
//     return <ChildrenGrowing />;
//   },
//   ($container) => {
//     ChildrenGrowingState[1]([1, 2, 3]);
//     return (
//       $container.firstChild?.textContent?.includes("start") &&
//       $container.lastChild?.textContent?.includes("end") &&
//       $container.childNodes[2]?.textContent?.includes("2")
//     );
//   }
// );

// let CreateRowReducer: any;
// test(
//   "CreateRowReducerTest",
//   () => {
//     const initialState = { data: [], selected: 0 } as {
//       data: {
//         id: number;
//         label: string;
//       }[];
//       selected: number;
//     };

//     const listReducer = (state: typeof initialState, action: any) => {
//       switch (action.type) {
//         case "RUN":
//           return {
//             ...state,
//             data: [
//               ...state.data,
//               {
//                 id: state.data.length,
//                 label: `item-${state.data.length + 1}`,
//               },
//             ],
//           };
//         case "REMOVE": {
//           const idx = state.data.findIndex((d: any) => d.id === action.id);
//           return {
//             data: [...state.data.slice(0, idx), ...state.data.slice(idx + 1)],
//             selected: state.selected,
//           };
//         }
//         case "SELECT":
//           return {
//             ...state,
//             selected: action.id,
//           };
//         default:
//           return state;
//       }
//     };

//     const Row = ({ selected, item, dispatch }: any) => (
//       <tr class={`row${selected ? " bg-danger" : ""}`}>
//         <td class="col-md-1">{item.id}</td>
//         <td class="col-md-4">
//           <a onClick={() => dispatch({ type: "SELECT", id: item.id })}>{item.label}</a>
//         </td>
//         <td class="col-md-1">
//           <a onClick={() => dispatch({ type: "REMOVE", id: item.id })}>
//             <span class="glyphicon glyphicon-remove" aria-hidden="true" />
//           </a>
//         </td>
//       </tr>
//     );

//     const CreateRowReducerTest = () => {
//       const [{ data, selected }, dispatch] = (CreateRowReducer = useReducer(listReducer, initialState));

//       return (
//         <div id="container">
//           <div class="row">
//             <button id="run" onClick={() => dispatch({ type: "RUN" })}>
//               Create 1 row
//             </button>
//           </div>
//           {data.map((item) => (
//             <Row item={item} selected={selected === item.id} dispatch={dispatch} />
//           ))}
//         </div>
//       );
//     };
//     return <CreateRowReducerTest />;
//   },
//   ($container) => {
//     CreateRowReducer[1]({ type: "RUN" });
//     return $container.querySelector("tr.row") != null;
//   }
// );

// let RemoveRowReducer: [
//   {
//     id: number;
//     label: string;
//   }[],
//   any
// ];
// test(
//   "RemoveRowReducerTest",
//   () => {
//     const RemoveRowReducerTest = () => {
//       const [data, dispatch] = (RemoveRowReducer = useReducer(
//         (state, action) => {
//           switch (action.type) {
//             case "CLEAR": {
//               return [];
//             }
//             default:
//               return state;
//           }
//         },
//         [
//           {
//             id: 1,
//             label: `item-1`,
//           },
//           {
//             id: 2,
//             label: `item-2`,
//           },
//         ]
//       ));

//       return (
//         <div id="container">
//           {data.map((item) => (
//             <div id={`item-${item.id}`}>
//               {/* {item.id} */}
//               {/* Why does adding this nested <td> break? */}
//               <div id={`item-nested-${item.id}`}>{item.id}</div>
//             </div>
//           ))}
//           <div id="after">After</div>
//           <button onClick={() => dispatch({ type: "CLEAR" })}>clear</button>
//         </div>
//       );
//     };
//     return <RemoveRowReducerTest />;
//   },
//   ($container) => {
//     RemoveRowReducer[1]({ type: "CLEAR", id: 2 });
//     return (
//       $container.querySelector("#item-1") == null &&
//       $container.querySelector("#item-2") == null &&
//       $container.querySelector("#after") != null
//     );
//   }
// );

// let JSRuntimeReducer: any;
// test(
//   "JSRuntimeTest",
//   () => {
//     const random = (max: number) => Math.round(Math.random() * 1000) % max;
//     const A = [
//       "pretty",
//       "large",
//       "big",
//       "small",
//       "tall",
//       "short",
//       "long",
//       "handsome",
//       "plain",
//       "quaint",
//       "clean",
//       "elegant",
//       "easy",
//       "angry",
//       "crazy",
//       "helpful",
//       "mushy",
//       "odd",
//       "unsightly",
//       "adorable",
//       "important",
//       "inexpensive",
//       "cheap",
//       "expensive",
//       "fancy",
//     ];
//     const C = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
//     const N = [
//       "table",
//       "chair",
//       "house",
//       "bbq",
//       "desk",
//       "car",
//       "pony",
//       "cookie",
//       "sandwich",
//       "burger",
//       "pizza",
//       "mouse",
//       "keyboard",
//     ];

//     let nextId = 1;

//     const buildData = (
//       count: number
//     ): {
//       id: number;
//       label: string;
//     }[] => {
//       const data = new Array(count);

//       for (let i = 0; i < count; i++) {
//         data[i] = {
//           id: nextId++,
//           label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
//         };
//       }

//       return data;
//     };

//     const initialState = { data: [], selected: 0 } as {
//       data: ReturnType<typeof buildData>;
//       selected: number;
//     };

//     const listReducer = (state: typeof initialState, action: any) => {
//       const { data, selected } = state;

//       switch (action.type) {
//         case "RUN":
//           return { data: buildData(1000), selected: 0 };
//         case "RUN_LOTS":
//           return { data: buildData(10000), selected: 0 };
//         case "ADD":
//           return { data: data.concat(buildData(1000)), selected };
//         case "UPDATE": {
//           const newData = data.slice(0);

//           for (let i = 0; i < newData.length; i += 10) {
//             const r = newData[i];

//             newData[i] = { id: r.id, label: r.label + " !!!" };
//           }

//           return { data: newData, selected };
//         }
//         case "CLEAR":
//           return { data: [], selected: 0 };
//         case "SWAP_ROWS":
//           const newdata = [...data];
//           const d1 = newdata[0];
//           const dn = newdata[newdata.length - 1];
//           newdata[0] = dn;
//           newdata[newdata.length - 1] = d1;
//           return { data: newdata, selected };
//         case "REMOVE": {
//           const idx = data.findIndex((d: any) => d.id === action.id);

//           return {
//             data: [...data.slice(0, idx), ...data.slice(idx + 1)],
//             selected,
//           };
//         }
//         case "SELECT":
//           return { data, selected: action.id };
//         default:
//           return state;
//       }
//     };

//     const Row = ({ selected, item, dispatch }: any) => (
//       <tr class={`row${selected ? " danger" : ""}`}>
//         <td class="col-md-1">{item.id}</td>
//         <td class="col-md-4">
//           <a onClick={() => dispatch({ type: "SELECT", id: item.id })}>{item.label}</a>
//         </td>
//         <td class="col-md-1">
//           <a onClick={() => dispatch({ type: "REMOVE", id: item.id })}>
//             <span class="glyphicon glyphicon-remove" aria-hidden="true" />
//           </a>
//         </td>
//         <td class="col-md-6" />
//       </tr>
//     );

//     const Button = ({ id, cb, title }: any) => (
//       <button type="button" class="btn btn-primary btn-block" id={id} onClick={cb}>
//         {title}
//       </button>
//     );

//     const Main = () => {
//       JSRuntimeReducer = useReducer(listReducer, initialState);
//       const [{ data, selected }, dispatch] = JSRuntimeReducer;

//       return (
//         <>
//           <div class="jumbotron">
//             <div id="header" class="row">
//               <div class="col-md-6">
//                 <h1>JINX</h1>
//               </div>
//               <div class="col-md-6">
//                 <div class="row">
//                   <Button id="run" title="Create 1,000 rows" cb={() => dispatch({ type: "RUN" })} />
//                   <Button id="runlots" title="Create 10,000 rows" cb={() => dispatch({ type: "RUN_LOTS" })} />
//                   <Button id="add" title="Append 1,000 rows" cb={() => dispatch({ type: "ADD" })} />
//                   <Button id="update" title="Update every 10th row" cb={() => dispatch({ type: "UPDATE" })} />
//                   <Button id="clear" title="Clear" cb={() => dispatch({ type: "CLEAR" })} />
//                   <Button id="swaprows" title="Swap Rows" cb={() => dispatch({ type: "SWAP_ROWS" })} />
//                 </div>
//               </div>
//             </div>
//           </div>

//           <table class="table table-hover table-striped test-data">
//             <tbody>
//               {data.map((item: any) => (
//                 <Row item={item} selected={selected === item.id} dispatch={dispatch} />
//               ))}
//             </tbody>
//           </table>
//         </>
//       );
//     };
//     return <Main />;
//   },
//   ($container) => {
//     JSRuntimeReducer[1]({ type: "RUN" });
//     JSRuntimeReducer[1]({ type: "CLEAR" });
//     return $container.querySelector("#header") != null;
//   }
// );

runTests();
