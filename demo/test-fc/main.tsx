import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [num, setNum] = useState(100);
	// window.setNum = setNum;

	const arr =
		num % 2 === 0
			? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
			: [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>];

	return (
		<ul
			onClickCapture={() => {
				setNum((num1) => num1 + 1);
				setNum((num2) => num2 + 1);
				setNum((num3) => num3 + 1);
			}}
		>
			{num}
		</ul>
	);
	return <ul onClickCapture={() => setNum(num + 1)}>{arr}</ul>;
}

function Child() {
	return <div>mini-react-swell</div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
