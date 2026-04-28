import { beforeEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";

describe("Fragments", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("empty fragment should render comment placeholder", async () => {
    document.body.append(<></>);
    expect(document.body.childNodes[1]?.nodeType === Node.COMMENT_NODE);
  });

  test("should render hi", async () => {
    document.body.append(<>hi</>);
    await expect.element(page.getByText("hi")).toBeInTheDocument();
  });

  test("nested fragments should render hi", async () => {
    document.body.append(
      <>
        <></>
        <>
          <>
            <>
              <>hi</>
            </>
          </>
        </>
        <></>
      </>
    );
    await expect.element(page.getByText("hi")).toBeInTheDocument();
  });

  test("should render multiple text nodes", async () => {
    document.body.append(
      <>
        {1}two{3}
      </>
    );
    expect(document.body.childNodes[1]?.textContent === "1");
    expect(document.body.childNodes[2]?.textContent === "two");
    expect(document.body.childNodes[3]?.textContent === "3");
  });
});
