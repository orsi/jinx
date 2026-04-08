import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { useState, useEffect } from "jinx";

describe("useEffect", () => {
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

  // test("effect: cleanup runs before each re-render", async () => {
  //   let cleanupCount = 0;
  //   let UseEffectCleanupTestState: any;

  //   const UseEffectCleanupTest = () => {
  //     UseEffectCleanupTestState = useState(0);
  //     useEffect(() => {
  //       return () => {
  //         cleanupCount++;
  //       };
  //     }, [UseEffectCleanupTestState[0]]);
  //     return (
  //       <div id="use-effect-cleanup-test">
  //         previous cleanupCount: {cleanupCount}
  //         <br />
  //         state: {UseEffectCleanupTestState[0]}
  //       </div>
  //     );
  //   };

  //   document.body.appendChild(<UseEffectCleanupTest />);

  //   UseEffectCleanupTestState[1](1);
  //   UseEffectCleanupTestState[1](2);
  //   UseEffectCleanupTestState[1](3);
  //   expect(UseEffectCleanupTestState[0]).toBe(3);
  //   expect(cleanupCount).toBe(3);
  // });

  // test("effect: cleanup runs on unmount", async () => {
  //   let effectRan = false;
  //   let effectCleanupUnmount = false;
  //   let UseEffectCleanupUnmountTestState: any;

  //   const First = () => {
  //     useEffect(() => {
  //       effectRan = true;
  //       return () => {
  //         effectCleanupUnmount = true;
  //       };
  //     }, []);
  //     return <div id="first">first</div>;
  //   };

  //   const UseEffectCleanupUnmountTest = () => {
  //     const [toggle, setToggle] = (UseEffectCleanupUnmountTestState = useState(false));
  //     return (
  //       <div id="use-effect-cleanup-unmount-test">
  //         {!toggle && <First />}
  //         {toggle && <div id="second">second</div>}
  //       </div>
  //     );
  //   };

  //   document.body.appendChild(<UseEffectCleanupUnmountTest />);

  //   UseEffectCleanupUnmountTestState[1](true);
  //   expect(effectRan).toBe(true);
  //   expect(effectCleanupUnmount).toBe(true);
  // });
});
