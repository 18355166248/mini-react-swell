import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [num, updateNum] = useState(0);
	window.updateNum = updateNum;
	return num === 3 ? <Child /> : <div>{num}</div>;
}

function Child() {
	return <div>mini-react-swell</div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
