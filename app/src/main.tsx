import { createRoot, Fragment, useReducer, useState } from "jinx";
import "./style.css";

function ChildrenTest({ prop1, prop2, children }: any) {
  return (
    <div id="1">
      {children}
      <h5>
        <em>{prop1}</em>
        <strong>{prop2}</strong>
      </h5>
    </div>
  );
}

function CountTest({ message }: { message: string }) {
  const [count, setCount] = useState(0);

  function onClick() {
    setCount(count + 1);
  }

  return (
    <>
      <button type="button" onClick={onClick}>
        {message}
      </button>
      <div>Count: {count}</div>
    </>
  );
}

function SwitchElementsTest() {
  const [toggle, setToggle] = useState(true);

  const onClick = () => {
    setToggle(!toggle);
  };

  return (
    <>
      <button onClick={onClick}>Switch!</button>
      {toggle ? <div>1</div> : <div style="text-align: right">2</div>}
      <hr />
      {toggle && <small>up</small>}
      {!toggle && <em>down</em>}
    </>
  );
}

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

const buildData = (count: number) => {
  const data = [];

  for (let i = 0; i < count; i++) {
    data.push({
      id: nextId++,
      label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
    });
  }

  return data;
};

const initialState = { data: [], selected: 0 } as {
  data: ReturnType<typeof buildData>;
  selected?: number;
};

const listReducer = (state: typeof initialState, action: { type: string; id?: number }) => {
  const { data, selected } = state;

  switch (action.type) {
    case "RUN_10":
      return { data: buildData(10), selected: 0 };
    case "RUN":
      return { data: buildData(1000), selected: 0 };
    case "RUN_LOTS":
      return { data: buildData(10000), selected: 0 };
    case "ADD":
      return { data: [...data, ...buildData(5)], selected };
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
      const d1 = newdata[0];
      const d998 = newdata[data.length - 1];
      newdata[0] = d998;
      newdata[data.length - 1] = d1;
      return { data: newdata, selected };
    case "REMOVE": {
      const idx = data.findIndex((d) => d.id === action.id);
      return { data: [...data.slice(0, idx), ...data.slice(idx + 1)], selected };
    }
    case "SELECT":
      return { data, selected: action.id };
    default:
      return state;
  }
};

function Row({
  selected,
  item,
  dispatch,
}: {
  selected: boolean;
  item: (typeof initialState)["data"][number];
  dispatch: (action: Parameters<typeof listReducer>[1]) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        color: selected ? "red" : "",
      }}
    >
      {item.id}
      <a onClick={() => dispatch({ type: "SELECT", id: item.id })}>{item.label}</a>
      <a onClick={() => dispatch({ type: "REMOVE", id: item.id })}>Remove</a>
    </div>
  );
}

const RowTest = () => {
  const [{ data, selected }, dispatch] = useReducer(listReducer, initialState);
  return (
    <>
      <div id="buttons" style="display: flex; gap: 2px;">
        <button onClick={() => dispatch({ type: "RUN_10" })}>Create 10 rows</button>
        <button onClick={() => dispatch({ type: "RUN" })}>Create 1,000 rows</button>
        <button onClick={() => dispatch({ type: "RUN_LOTS" })}>Create 10,000 rows</button>
        <button onClick={() => dispatch({ type: "ADD" })}>Append 5 rows</button>
        <button onClick={() => dispatch({ type: "UPDATE" })}>Update every 10th row</button>
        <button onClick={() => dispatch({ type: "SWAP_ROWS" })}>Swap Rows</button>
        <button onClick={() => dispatch({ type: "CLEAR" })}>Clear</button>
      </div>
      <ul id="3">
        {data.map((item) => (
          // <li>{item.id}</li>
          <Row item={item} selected={selected === item.id} dispatch={dispatch} />
        ))}
      </ul>
    </>
  );
};

function RouteTest() {
  const [index, setIndex] = useState(0);

  return (
    <>
      <button onClick={() => setIndex((index + 1) % 2)}>Next</button>
      {index === 0 && <div id="0">first</div>}
      {index === 1 && (
        <div
          id="1"
          style={{
            color: "green",
          }}
        >
          second
        </div>
      )}
    </>
  );
}

function SmallComponent() {
  return <div style={{ border: "1px solid red", padding: "4px" }}>hi</div>;
}

function ChildrenTypeChange() {
  const [stateIndex, setStateIndex] = useState(0);
  const onClick = () => setStateIndex((stateIndex + 1) % 6);

  let element: any = <>fragment</>;
  switch (stateIndex) {
    case 1: {
      element = <div>html</div>;
      break;
    }
    case 2: {
      element = "string";
      break;
    }
    case 3: {
      element = 1;
      break;
    }
    case 4: {
      element = <SmallComponent />;
      break;
    }
    case 5: {
      element = ["children ", 1, false];
      break;
    }
  }
  return (
    <Fragment key="hi">
      <button onClick={onClick}>Switch</button>
      {element}
    </Fragment>
  );
}

function MiddleChildrenChange() {
  const [data, setData] = useState<string[]>([]);
  const onClick = () => {
    if (data.length === 0) {
      setData(["hi", "bye", "blue", "red"]);
    } else {
      setData([]);
    }
  };

  return (
    <>
      <button onClick={onClick}>{data.length === 0 ? "show" : "hide"}</button>
      <ol id="list">
        <li>before</li>
        <hr />
        {data.map((item, i) => (
          <li>{item}</li>
        ))}
        <hr />
        <li>after</li>
      </ol>
    </>
  );
}

createRoot(document.querySelector("#app")!).render("hello");
// createRoot(document.querySelector("#app")!).render(<h1>hello</h1>);
// createRoot(document.querySelector("#app")!).render([1, 2, 3, "boink", false, 4]);
// createRoot(document.querySelector("#app")!).render(<div style={{ textAlign: "right" }}>text right</div>);
// createRoot(document.querySelector("#app")!).render(
//   <div>
//     <h1>
//       <em>hi</em>
//       <strong>bye</strong>
//     </h1>
//   </div>
// );
// createRoot(document.querySelector("#app")!).render(
//   <ChildrenTest prop1="hi" prop2="bye">
//     i'm child
//   </ChildrenTest>
// );
// createRoot(document.querySelector("#app")!).render(<SwitchElementsTest />);
// createRoot(document.querySelector("#app")!).render(<CountTest message="hi" />);
// createRoot(document.querySelector("#app")!).render(<RowTest />);
// createRoot(document.querySelector("#app")!).render(<ChildrenTypeChange />);
// createRoot(document.querySelector("#app")!).render(<RouteTest />);
// createRoot(document.querySelector("#app")!).render(<MiddleChildrenChange />);
