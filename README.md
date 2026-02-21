# jinx

a minimalist jsx rendering library (1.669kb gzipped)

## setup

```ts
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "preserve"
  }
}
```

```ts
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "transform",
    jsxFactory: "__jsx",
    jsxFragment: "__Fragment",
    jsxInject: "import { jsx as __jsx, Fragment as __Fragment } from 'jinx';",
  },
});
```

## about

nothing really here now other than:

- exports:
  - `useState(initialValue)`
  - `useReducer(reducer, initialState)`
  - `jsx` and `Fragment` aka `<></>`
    - you'd most likely setup Vite or Typescript to auto-import these type definitions for working with HTML elements and function components in JSX
- renders JSX/TSX syntax
- testing app based off [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark)

```tsx
function MyApp() {
  const [toggle, setToggle] = useState(true);

  const onClick = () => {
    setToggle(!toggle);
  };

  return (
    <>
      <button onClick={onClick}>Switch!</button>
      {toggle ? <div>1</div> : <div style={{ textAlign: "right" }}>2</div>}
      <hr />
      {toggle && <small>up</small>}
      {!toggle && <em>down</em>}
    </>
  );
}
```

## quick dev start

```
git clone https://github.com/orsi/jinx.git
cd jinx
npm i
npm run dev
```
