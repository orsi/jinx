import { beforeEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { useState, useEffect } from "jinx";

describe("useEffect", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("effect: runs after render into DOM", async () => {
    const UseEffectTest = () => {
      useEffect(() => {
        const el = document.querySelector<HTMLDivElement>("#use-effect-test");
        if (el) el.textContent = "hi";
      }, []);
      return <div id="use-effect-test">yo</div>;
    };

    document.body.appendChild(<UseEffectTest />);
    await expect.element(page.getByText("hi")).toBeInTheDocument();
  });

  test("effect: cleanup runs before each re-render", async () => {
    let cleanupCount = 0;
    let UseEffectCleanupTestState: any;

    const UseEffectCleanupTest = () => {
      UseEffectCleanupTestState = useState(0);
      useEffect(() => {
        return () => {
          console.log(`cleanup run ${cleanupCount}`);
          cleanupCount++;
        };
      }, [UseEffectCleanupTestState[0]]);
      return (
        <div id="use-effect-cleanup-test">
          previous cleanupCount: {cleanupCount}
          <br />
          state: {UseEffectCleanupTestState[0]}
        </div>
      );
    };

    document.body.appendChild(<UseEffectCleanupTest />);

    // MUTATION OBSERVER DOES NOT RUN UNTIL EXECUTION IS DONE!
    // Therefore, no initial onRender is being called before the following
    // expect statements. However, the subsequent state setters DO call it,
    // and the clenaupCount is always 1 behind

    // this would always be 1 cleanupCount behind
    // expect(cleanupCount).toBe(0);
    // UseEffectCleanupTestState[1](1);
    // expect(cleanupCount).toBe(1);
    // UseEffectCleanupTestState[1](2);
    // expect(cleanupCount).toBe(2);
    // UseEffectCleanupTestState[1](3);
    // expect(cleanupCount).toBe(3);

    // we await here to force DOM updates so MutationObserver will run
    await expect(null);
    expect(cleanupCount).toBe(0);
    UseEffectCleanupTestState[1](1);
    expect(cleanupCount).toBe(1);
    UseEffectCleanupTestState[1](2);
    expect(cleanupCount).toBe(2);
    UseEffectCleanupTestState[1](3);
    expect(cleanupCount).toBe(3);
  });

  test("effect: cleanup runs on unmount", async () => {
    let effectRan = false;
    let effectCleanupUnmount = false;
    let UseEffectCleanupUnmountTestState: any;

    const First = () => {
      useEffect(() => {
        effectRan = true;
        return () => {
          effectCleanupUnmount = true;
        };
      }, []);
      return <div id="first">first</div>;
    };

    const UseEffectCleanupUnmountTest = () => {
      const [toggle] = (UseEffectCleanupUnmountTestState = useState(false));
      return (
        <div id="use-effect-cleanup-unmount-test">
          {!toggle && <First />}
          {toggle && <div id="second">second</div>}
        </div>
      );
    };

    expect(effectRan).toBe(false);
    document.body.appendChild(<UseEffectCleanupUnmountTest />);

    // we need await to allow MutationObserver to run onRender once
    await expect.element(page.getByText("first")).toBeInTheDocument();
    await expect.element(page.getByText("second")).not.toBeInTheDocument();
    expect(effectRan).toBe(true);
    expect(effectCleanupUnmount).toBe(false);
    UseEffectCleanupUnmountTestState[1](true);

    // after
    expect(effectCleanupUnmount).toBe(true);
    await expect.element(page.getByText("first")).not.toBeInTheDocument();
    await expect.element(page.getByText("second")).toBeInTheDocument();
  });
});
