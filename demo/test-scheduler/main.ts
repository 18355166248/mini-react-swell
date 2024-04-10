const btn = document.querySelector('.btn') as HTMLElement;
const root = document.querySelector('#root') as HTMLElement;

interface Work {
	count: number;
}

const workList: Work[] = [];

function scheduler() {
	const curWork = workList.pop();
	if (curWork) {
		perform(curWork);
	}
}

function perform(work: Work) {
	while (work.count) {
		work.count--;
		insertSpan('1');
	}

	scheduler();
}

function insertSpan(content) {
	const span = document.createElement('span');
	span.textContent = content;
	root && root.appendChild(span);
}

btn &&
	(btn.onclick = () => {
		workList.unshift({
			count: 2000
		});
		scheduler();
	});
