import React from 'react';
import { useState, useEffect } from 'react';
import ReactDom from 'react-dom/client';

function App() {
	const [num, updateNum] = useState(100);

	// useEffect(() => {
	// 	console.log('App mount');
	// }, []);

	// useEffect(() => {
	// 	console.log('num change create', num);

	// 	return () => {
	// 		console.log('num change destroy', num);
	// 	};
	// }, [num]);

	return (
		<div
			onClick={() => {
				updateNum(50);
			}}
		>
			<ul>
				{new Array(num).fill(0).map((_, i) => (
					<Child key={i}>{i}</Child>
				))}
			</ul>
		</div>
	);
}

function Child({ children }) {
	// useEffect(() => {
	// 	console.log('child mount');
	// 	return () => {
	// 		console.log('child unmount');
	// 	};
	// });
	const now = performance.now();
	while (performance.now() - now < 4) {}

	return <li>{children}</li>;
}

ReactDom.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
