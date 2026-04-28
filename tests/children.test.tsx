import { beforeEach, describe, expect, test } from "vitest";
import { useState } from "jinx";

describe("Children", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("children swap order", async () => {
    let ChildrenSwapState: any;
    const Swap = () => {
      const [data] = (ChildrenSwapState = useState(() => ["1", 2, "3", <span>4</span>]));
      return data;
    };

    document.body.appendChild(<Swap />);

    ChildrenSwapState[1]((value: any[]) => {
      const next = [...value];
      next.push(next.shift()!);
      return next;
    });

    expect(document.body.firstChild?.textContent).toContain("2");
    expect(document.body.lastChild?.textContent).toContain("1");
  });

  test("children shrink to empty", async () => {
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

  test("children grow from empty", async () => {
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
});
