import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber';
import { HostRoot } from './workTags';

let workingProgress: FiberNode | null = null;

// 前置操作
function prepareFreshStake(root: FiberRootNode) {
	workingProgress = createWorkInProgress(root.current, {});
}

export function scheduleUpdateFiber(fiber: FiberNode) {
	// 调度功能
	const root = markUpdateFromFiberToRoot(fiber);
	renderRoot(root);
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;
	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}
	return null;
}

function renderRoot(root: FiberRootNode) {
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
