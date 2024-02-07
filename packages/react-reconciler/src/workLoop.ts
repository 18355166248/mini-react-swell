import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { FiberNode } from './fiber';

let workingProgress: FiberNode | null = null;

// 前置操作
function prepareFreshStake(fiber: FiberNode) {
	workingProgress = fiber;
}

function rederRoot(root: FiberNode) {
	// 初始化
	prepareFreshStake(root);

	do {
		try {
			workLoop();
			break;
		} catch (error) {
			console.warn('workLoop error', error);

			workingProgress = null;
		}
	} while (true);
}

function workLoop() {
	// TODO: 实现 workLoop
	while (workingProgress !== null) {
		performUnitWork(workingProgress);
	}
}

function performUnitWork(fiber: FiberNode) {
	// 开始递
	const next = beginWork(fiber);
	fiber.memoizedProps = fiber.pendingProps;

	if (next === null) {
		// 开始归
		completeUnitOfWork(fiber);
	} else {
		// 结束
		workingProgress = next;
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;

	do {
		completeWork(node);
		const sibling = node.sibling;
		if (sibling !== null) {
			workingProgress = sibling;
			return;
		}
		node = node.return;
		workingProgress = node;
	} while (node !== null);
}
