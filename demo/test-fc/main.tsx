import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [num, updateNum] = useState(0);
	window.updateNum = updateNum; 
	return (
		<div>
			{/* <Child /> */}
			<div>{num}</div>
		</div>
	);
}

function Child() {
	return <div>mini-react-swell</div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
