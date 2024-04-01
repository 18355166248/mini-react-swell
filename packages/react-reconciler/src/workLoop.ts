import { beginWork } from './beginWork';
import { commitMutationEffects } from './comitWork';
import { completeWork } from './completeWork';
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber';
import { MutationMask, NoFlags } from './fiberFlags';
import {
	Lane,
	NoLane,
	SyncLine,
	getHighestPriority,
	mergeLanes
} from './fiberLane';
import { HostRoot } from './workTags';

let workingProgress: FiberNode | null = null;

// 前置操作
function prepareFreshStake(root: FiberRootNode) {
	workingProgress = createWorkInProgress(root.current, {});
}

export function scheduleUpdateFiber(fiber: FiberNode, lane: Lane) {
	// 调度功能
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdate(root, lane);
	ensureRootScheduled(root);
}

// 保持我们的任务被调度
function ensureRootScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriority(root.pendingLanes);
	if (updateLane === NoLane) {
		return;
	}
	if (updateLane === SyncLine) {
		// 同步优先级 用微任务调度

	} else {
		// 其他优先级 用宏任务调度
	}
}

function markRootUpdate(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
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
			if (__DEV__) {
				console.warn('workLoop error', error);
			}

			workingProgress = null;
		}
	} while (true);

	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;

	// wip fiberNode树
	commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;
	if (finishedWork === null) {
		return;
	}

	if (__DEV__) {
		console.warn('commit阶段开始', finishedWork);
	}

	// 重置操作
	root.finishedWork = null;

	// 判断是否存在三个子阶段需要执行的操作
	// root flags subTreeFlags
	const subTreeHasEffects =
		(finishedWork.subTreeFlags & MutationMask) !== NoFlags;
	const rootHasEffects = (finishedWork.flags & MutationMask) !== NoFlags;

	if (subTreeHasEffects || rootHasEffects) {
		// beforeMutation
		// mutation
		commitMutationEffects(finishedWork);
		root.current = finishedWork;
		// layout
	} else {
		root.current = finishedWork;
	}
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
