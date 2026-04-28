import { beforeEach, describe, expect, test } from "vitest";

describe("Elements", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("should render", async () => {
    document.body.append(<div />);
    const div = document.querySelector("div");
    await expect.element(div).toBeInTheDocument();
  });

  test("should not have any attributes", async () => {
    const div = (<div />) as HTMLElement;
    document.body.append(div);
    expect(div.attributes.length === 0);
  });

  test("conditional rendering and short-circuit expressions", async () => {
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

    console.dir(document.body.childNodes);
    expect(document.body.childNodes?.[0]?.nodeName).toBe("H1");
    expect(document.body.childNodes?.[1]?.nodeName).toBe("MARQUEE");
    expect(document.body.childNodes?.[2]?.nodeName).toBe("#comment");
    expect(document.body.childNodes?.[3]?.nodeName).toBe("DIV");
    expect(document.body.childNodes?.[4]?.nodeName).toBe("DIV");
  });

  test("css style object applied to element", async () => {
    document.body.appendChild(
      <div
        id="div"
        style={{
          backgroundColor: "red",
          fontSize: "72px",
          fontWeight: "900",
        }}
      >
        Testing
      </div>
    );

    expect(document.body.childNodes[0]?.nodeName).toBe("DIV");
    const div = document.querySelector<HTMLDivElement>("#div")!;
    expect(div).toBeInTheDocument();
    expect(div.style.backgroundColor).toBe("red");
    expect(div.style.fontSize).toBe("72px");
    expect(div.style.fontWeight).toBe("900");
  });
});
