import { useState, useEffect } from 'react';
import ReactDom from 'react-dom/client';

function App() {
	const [num, updateNum] = useState(0);

	useEffect(() => {
		console.log('App mount');
	}, []);

	useEffect(() => {
		console.log('num change create', num);

		return () => {
			console.log('num change destroy', num);
		};
	}, [num]);

	return (
		<div
			onClick={(e) => {
				updateNum((num: number) => num + 1);
			}}
		>
			你好
			{num === 0 ? <Child /> : 'noop'}
		</div>
	);
}

function Child() {
	useEffect(() => {
		console.log('child mount');
		return () => {
			console.log('child unmount');
		};
	});

	return <p>i am child.</p>;
}

ReactDom.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
