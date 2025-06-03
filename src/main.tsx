import { createRoot, useState } from "./jsx-runtime";
import "./style.css";

export function MyApp({ prop1, children }: { prop1: string; children: any }) {
  return (
    <>
      <h2>
        {children}
        <em>italics baby</em>
      </h2>
      <MyCounter message="Render" />
      <Switcher testAttribute="yo"></Switcher>
      {prop1}
      <h2>
        {children}
        <em>italics baby</em>
      </h2>
    </>
  );
}

function MyCounter({ message }: { message: string }) {
  const [count, setCount] = useState(0);

  function onClick() {
    setCount(count + 1);
  }

  return (
    <div>
      <button type="button" onClick={onClick}>
        {message}: {count}
      </button>
    </div>
  );
}

function Switcher() {
  const [toggle, setToggle] = useState(true);

  const onClick = () => {
    setToggle(!toggle);
  };

  return (
    <>
      <button style={"margin-top: 120px;"} onClick={onClick}>
        Switch!
      </button>
      {/* {toggle ? <MyCounter message="Count" /> : <h5>butt</h5>} */}
      {/* {toggle ? <h1>1</h1> : <h2>butt</h2>} */}
      {toggle && <h1>1</h1>}
      {!toggle && <h2>butt</h2>}
    </>
  );
}

// render(document.querySelector("#app")!, <MyApp prop1="YO!" />);
// createRoot(document.querySelector("#app")!).render("hi!");
// createRoot(document.querySelector("#app")!).render(<MyCounter message="Render" />);
// createRoot(document.querySelector("#app")!).render(
//   <>
//     <div>1</div>
//     <h1>2</h1>
//   </>
// );
// createRoot(document.querySelector("#app")!).render(
//   <MyApp prop1="YO!">
//     <h1>child 1</h1>
//   </MyApp>
// );
// createRoot(document.querySelector("#app")!).render(<Switcher />);

const random = (max) => Math.round(Math.random() * 1000) % max;

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

const count = 10000;
const _data = new Array(count);
for (let i = 0; i < count; i++) {
  _data[i] = {
    id: nextId++,
    label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
  };
}

const Row = ({ selected, item, onClick }) => (
  <tr style={selected ? "background: red;" : ""} onClick={onClick}>
    <td className="col-md-1">{item.id}</td>
    <td className="col-md-4">
      <a>{item.label}</a>
    </td>
    <td className="col-md-1">
      <a>
        <span className="glyphicon glyphicon-remove" aria-hidden="true" />
      </a>
    </td>
    <td className="col-md-6" />
  </tr>
);

const Button = ({ id, cb, title }) => (
  <div className="col-sm-6 smallpad">
    <button type="button" className="btn btn-primary btn-block" id={id} onClick={cb}>
      {title}
    </button>
  </div>
);

const Main = () => {
  const [data, setData] = useState(_data);
  const [selected, setSelected] = useState(_data.map((i) => i.id));
  function dispatch(obj: any) {
    console.log(obj);
  }

  function onSelect(id: string) {
    const newSelected = [...selected.filter((s) => s !== id)];
    if (!selected.includes(id)) {
      newSelected.push(id);
    }
    setSelected(newSelected);
  }

  return (
    <div className="container">
      <div className="jumbotron">
        <div className="row">
          <div className="col-md-6">
            <h1>React Hooks keyed</h1>
          </div>
          <div className="col-md-6">
            <div className="row">
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
      <table className="table table-hover table-striped test-data">
        <tbody>
          {data.map((item) => (
            <Row key={item.id} item={item} selected={selected.includes(item.id)} onClick={() => onSelect(item.id)} />
          ))}
        </tbody>
      </table>
      <span className="preloadicon glyphicon glyphicon-remove" aria-hidden="true" />
    </div>
  );
};

const t0 = performance.now();
createRoot(document.getElementById("app")!).render(<Main />);
const t1 = performance.now();
console.log(`${t1 - t0} milliseconds.`);
