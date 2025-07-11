# jinx

a minimalist jsx rendering library

## about

nothing really here now other than:

- exports:
  - `createRoot(document.querySelector('#app')).render(<MyApp />)`
  - `useState(initialValue)`
  - `useReducer(reducer, initialState)`
  - `jsx` and `Fragment` aka `<></>`
    - you'd most likely setup Vite or Typescript to auto-import these
- type definitions for working with HTML elements and function components in JSX
- renders JSX/TSX syntax
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
