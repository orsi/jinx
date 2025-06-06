import { createRoot, useReducer, useState } from "./jsx-runtime";
import "./style.css";

function ChildrenTest({ prop1, prop2, children }: any) {
  return (
    <>
      <div>{children}</div>
      <h5>
        <>
          <em>{prop1}</em>
          <strong>{prop2}</strong>
        </>
      </h5>
    </>
  );
}
// createRoot(document.querySelector("#app")).render(
//   <ChildrenTest prop1="hi" prop2="bye">
//     <>
//       <h5>i'm child</h5>
//     </>
//   </ChildrenTest>
// );

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
// createRoot(document.querySelector("#app")).render(<CountTest message="hi" />);

function SwitchElementsTest() {
  const [toggle, setToggle] = useState(true);

  const onClick = () => {
    setToggle(!toggle);
  };

  return (
    <>
      <button onClick={onClick}>Switch!</button>
      <div>{toggle ? <h1>left</h1> : <h2>right</h2>}</div>
      <div>
        {toggle && <small>up</small>}
        {!toggle && <em>down</em>}
      </div>
    </>
  );
}
// createRoot(document.querySelector("#app")).render(<SwitchElementsTest />);

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
      const idx = data.findIndex((d) => d.id === action.id);

      return { data: [...data.slice(0, idx), ...data.slice(idx + 1)], selected };
    }
    case "SELECT":
      return { data, selected: action.id };
    default:
      return state;
  }
};

const Row = ({
  selected,
  item,
  dispatch,
}: {
  selected: boolean;
  item: (typeof initialState)["data"][number];
  dispatch: (action: Parameters<typeof listReducer>[1]) => void;
}) => (
  <tr className={selected ? "danger" : ""}>
    <td className="col-md-1">{item.id}</td>
    <td className="col-md-4">
      <a onClick={() => dispatch({ type: "SELECT", id: item.id })}>{item.label}</a>
    </td>
    <td className="col-md-1">
      <a onClick={() => dispatch({ type: "REMOVE", id: item.id })}>
        <span className="glyphicon glyphicon-remove" aria-hidden="true" />
      </a>
    </td>
    <td className="col-md-6" />
  </tr>
);

const RowTest = () => {
  const [index, setIndex] = useState("children-test");
  const [{ data, selected }, dispatch] = useReducer(listReducer, initialState);

  return (
    <div style="height: 100%; display: flex; flex-direction: column;">
      <h1 style="border-bottom: 1px solid rgba(255,255,255,.3); margin-bottom: 0;">Diagnostics</h1>
      <div style="height: 100%; display: flex; flex-direction: column;">
        <div id="buttons" style="display: flex; gap: 2px;">
          <button onClick={() => dispatch({ type: "RUN" })}>Create 1,000 rows</button>
          <button onClick={() => dispatch({ type: "RUN_LOTS" })}>Create 10,000 rows</button>
          <button onClick={() => dispatch({ type: "ADD" })}>Append 1,000 rows</button>
          <button onClick={() => dispatch({ type: "UPDATE" })}>Update every 10th row</button>
          <button onClick={() => dispatch({ type: "SWAP_ROWS" })}>Swap Rows</button>
          <button onClick={() => dispatch({ type: "CLEAR" })}>Clear</button>
        </div>
        <div style="height: 100%; min-height: 0; overflow: scroll;">
          <table>
            <tbody>
              {data.map((item) => (
                <Row item={item} selected={selected === item.id} dispatch={dispatch} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
createRoot(document.querySelector("#app")).render(<RowTest />);

function RouteTest() {
  const [index, setIndex] = useState(0);

  return (
    <>
      <button onClick={() => setIndex((index + 1) % 2)}>Next</button>
      {index === 0 && (
        <div id="0" style="display: flex; text-transform: uppercase;">
          <strong>0</strong>
          <h3 style="font-size: .5rem;">
            I should be <em>REMOVED!!!!</em> on 0
          </h3>
        </div>
      )}
      {index === 1 && (
        <div id="1" style="color: green; display: flex; flex-direction: column;">
          <h4>1</h4>
        </div>
      )}
    </>
  );
}
// createRoot(document.querySelector("#app")).render(<RouteTest />);

function FragmentTest() {
  const [toggle, setToggle] = useState(true);
  return toggle ? (
    <>
      <span onClick={() => setToggle(!toggle)}>1</span>
      <div style="color: red;">2</div>
      <h1 style="color: green;">3</h1>
      <h2 style="color: blue;">4</h2>
    </>
  ) : (
    <>
      <small style="color: blue;" onClick={() => setToggle(!toggle)}>
        small
      </small>
      <em>em</em>
    </>
  );
}
// createRoot(document.querySelector("#app")).render(<FragmentTest />);
