import { expect, test } from "vitest";
import { useState } from "jinx";
import { page } from "vitest/browser";

test("fragments: multiple values turn into text nodes", async () => {
  document.body.append(
    <>
      {1}two{3}
    </>
  );
  await expect.element(page.getByText("1")).toBeInTheDocument();
  await expect.element(page.getByText("two")).toBeInTheDocument();
  await expect.element(page.getByText("3")).toBeInTheDocument();
});

test("fragments: nested and toggling in dom", async () => {
  let FragmentTestState: any;
  const FragmentTest = ({ children }: JSX.PropsWithChildren) => {
    FragmentTestState = useState(0);
    const [count] = FragmentTestState;
    return (
      <>
        <>one, </>
        {count % 3 === 0 ? children : "muahaha!"}
      </>
    );
  };

  document.body.appendChild(
    <FragmentTest>
      <>two, </>
      <>three</>
    </FragmentTest>
  );

  await expect.element(page.getByText("one, two, three")).toBeInTheDocument();
  FragmentTestState[1](2);
  await expect.element(page.getByText("one, muahaha!")).toBeInTheDocument();
  FragmentTestState[1](3);
  await expect.element(page.getByText("one, two, three")).toBeInTheDocument();
});
