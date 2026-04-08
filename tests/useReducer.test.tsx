import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { useReducer } from "jinx";

describe("useReducer", () => {
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
});
