import {
	unstable_ImmediatePriority as ImmediatePriority,
	unstable_UserBlockingPriority as UserBlockingPriority,
	unstable_NormalPriority as NormalPriority,
	unstable_LowPriority as LowPriority,
	unstable_IdlePriority as IdlePriority,
	unstable_scheduleCallback as scheduleCallback,
	unstable_shouldYield as shouldYield,
	unstable_getFirstCallbackNode as getFirstCallbackNode,
	unstable_cancelCallback as cancelCallback,
	CallbackNode
} from 'scheduler';

const root = document.querySelector('#root') as HTMLElement;

type Priority =
	| typeof IdlePriority
	| typeof LowPriority
	| typeof NormalPriority
	| typeof UserBlockingPriority
	| typeof ImmediatePriority;

interface Work {
	count: number;
	priority: Priority;
}

[LowPriority, NormalPriority, UserBlockingPriority, ImmediatePriority].forEach(
	(priority) => {
		const btn = document.createElement('button');
		btn.innerText = [
			'',
			'ImmediatePriority',
			'UserBlockingPriority',
			'NormalPriority',
			'LowPriority'
		][priority];
		btn.onclick = () => {
			workList.push({ count: 1000, priority: priority as Priority });
			scheduler();
		};
		root.appendChild(btn);
	}
);

const workList: Work[] = [];
let prePriority: Priority = IdlePriority;
let curCallback: CallbackNode | null = null;

function scheduler() {
	const cbNode = getFirstCallbackNode();
	const curWork = workList.sort((w1, w2) => w1.priority - w2.priority)[0];

	// 策略逻辑
	if (!curWork) {
		curCallback = null;
		cbNode && cancelCallback(cbNode);
		return;
	}
	const { priority: curPriority } = curWork;

	if (curPriority === prePriority) {
		return;
	}
	// 更高优先级的任务
	cbNode && cancelCallback(cbNode);

	curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}

function perform(work: Work, didTimeout?: boolean) {
	/**
	 * 1.work.priority
	 * 2.饥饿问题
	 * 3.时间切片
	 */
	const needSync = work.priority === ImmediatePriority || didTimeout;
	// shouldYield 判断是否需要暂停
	while ((needSync || !shouldYield()) && work.count) {
		work.count--;
		insertSpan(work.priority + '');
	}

	// 中断执行 || 执行完
	prePriority = work.priority;

	if (!work.count) {
		const index = workList.indexOf(work);
		workList.splice(index, 1);
		prePriority = IdlePriority;
	}

	const preCallback = curCallback;
	// 如果scheduler里面优先级一样会直接return 那么callback就会不变 那么再去调度的还是上一次的work
	scheduler();
	const newCallback = curCallback;

	if (newCallback && newCallback === preCallback) {
		// 如果返回的是函数, 则会继续调度
		return perform.bind(null, work);
	}
}

function insertSpan(content) {
	const span = document.createElement('span');
	span.textContent = content;
	span.className = `pri-${content}`;
	domSomeBussWork(1000000);
	root && root.appendChild(span);
}

function domSomeBussWork(len: number) {
	let result = 0;
	while (len--) {
		result += len;
	}
	return result;
}
