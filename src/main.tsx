import { createRoot, useState } from "./jsx-runtime";
import "./style.css";

export function MyApp({ prop1 }: { prop1: string }) {
  return (
    <>
      {prop1}
      <h2>
        <em>italics baby</em>
      </h2>
      <MyCounter message="Render" />
      <Switcher testAttribute="yo"></Switcher>
    </>
  );
}

function MyCounter({ message }: { message: string }) {
  const [count, setCount] = useState(1);

  function onClick() {
    setCount(count + 1);
  }

  return (
    <>
      <div>count: {count}</div>
      <button type="button" onClick={onClick}>
        {message}
      </button>
    </>
  );
}

function Switcher() {
  const h1 = <MyCounter  message="testing component"/>;
  const h5 = <h5>butt</h5>;
  const [child, setChild] = useState(h1);

  const onClick = () => {
    console.log("switch!", child);
    if (child.tag === MyCounter) {
      setChild(h5);
    } else {
      setChild(h1);
    }
  };
  return (
    <div>
      <button onClick={onClick}>Switch!</button>
      {child}
    </div>
  );
}

// render(document.querySelector("#app")!, <MyApp prop1="YO!" />);
// render(document.querySelector("#app")!, "hi!");
// render(document.querySelector("#app")!, <div>yo!</div>);
// render(document.querySelector("#app")!, <MyCounter message="Render" />);
// render(
//   document.querySelector("#app")!,
//   <>
//     <div>1</div>2<span>3</span>
//   </>
// );
createRoot(document.querySelector("#app")!).render(<MyApp prop1="YO!" />);
