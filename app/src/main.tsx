import "./main.css";
import { useState, useReducer } from "jinx";

const CArray = () => {
  return [1, "hi", false ? <span>true</span> : <span>false</span>];
};

const CString = () => {
  return "hi";
};

const CNumber = () => {
  return 4;
};

const CBool = () => {
  return true;
};

const Count = ({ count }: { count: number }) => {
  return <div id="count">{count}</div>;
};

const Counter = ({ count }: { count: number }) => {
  return (
    <>
      <Count count={count} />
      {count % 2 === 0 ? <small id="even">EVEN!</small> : <small id="odd">ODD!</small>}
    </>
  );
};

const MyComponent = () => {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount((value) => ++value)}>Increase</button>
      <Counter count={count} />
      <CArray />
      <CString />
      <CNumber />
      <CBool />
    </>
  );
};

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
        {children}
      </button>
      <NestedStuff />
      <br />
      Count: {count} is {count % 2 === 0 ? "even" : <span>odd</span>}
      <br />
      <div style={{ marginTop: "60px" }}>
        <div>
          <div>
            <MyComponent />
          </div>
        </div>
      </div>
    </>
  );
};

const TernaryComponent = (
  <>
    <h1 style={{ color: "green" }}>title</h1>
    <TestButton>push me!</TestButton>
    {true && <marquee>true shortcircuit!</marquee>}
    {false && <marquee>false shortcircuit!</marquee>}
    {true ? <span>true tern!</span> : <span>false tern!</span>}
    {false ? <span>true tern!</span> : <span>false tern!</span>}
    {true && true}
    {false && false}
  </>
);

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
  <tr class={selected ? "danger" : ""}>
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
  <div class="col-sm-6 smallpad">
    <button type="button" class="btn btn-primary btn-block" id={id} onClick={cb}>
      {title}
    </button>
  </div>
);

const Main = ({ children }: JSX.ChildrenProps) => {
  const [{ data, selected }, dispatch] = useReducer(listReducer, initialState);

  return (
    <div class="container">
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
      <h2>TODO: children get removed on state update</h2>
      <div>{children}</div>
      <h2>TODO: children get removed on state update</h2>

      <table class="table table-hover table-striped test-data">
        <tbody>
          {data.map((item) => (
            <Row item={item} selected={selected === item.id} dispatch={dispatch} />
          ))}
        </tbody>
      </table>
      <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true" />
    </div>
  );
};

const t0 = performance.now();
document.querySelector<HTMLDivElement>("body")!.append(<Main>{TernaryComponent}</Main>);
const t1 = performance.now();

// const ComponentAsChild = () => <span>hi</span>;
// const Testing = ({ children }: { children: any }) => {
//   const [count, setCount] = useState(0);
//   return (
//     <>
//       <button onClick={() => setCount(count + 1)}>{children}</button>
//       {count}
//     </>
//   );
// };
// const t0 = performance.now();
// document.querySelector<HTMLDivElement>("body")!.append(
//   <Testing>
//     <ComponentAsChild />
//   </Testing>
// );
// const t1 = performance.now();
console.log(`rendered: ${(t1 - t0).toFixed()}ms`);
