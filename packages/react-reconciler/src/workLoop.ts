import { scheduleMicroMask } from 'hostConfig';
import { beginWork } from './beginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitMutationEffects
} from './comitWork';
import { completeWork } from './completeWork';
import {
	FiberNode,
	FiberRootNode,
	PendingPassiveEffect,
	createWorkInProgress
} from './fiber';
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags';
import {
	Lane,
	NoLane,
	SyncLine,
	getHighestPriority,
	markRootFinished,
	mergeLanes
} from './fiberLane';
import { flushSyncCallback, scheduleSyncCallback } from './syncTaskQueue';
import { HostRoot } from './workTags';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority
} from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

let workingProgress: FiberNode | null = null;
let workingProgressLane = NoLane;
let rootDoesHasPassiveEffects = false;

// 前置操作
function prepareFreshStake(root: FiberRootNode, lane: Lane) {
	workingProgress = createWorkInProgress(root.current, {});
	workingProgressLane = lane;
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
		if (__DEV__) {
			console.log('在微任务中调度, 优先级:', updateLane);
		}

		scheduleSyncCallback(performSyncOnRoot.bind(null, root, updateLane));
		scheduleMicroMask(flushSyncCallback);
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

function performSyncOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriority(root.pendingLanes);
	if (nextLane !== SyncLine) {
		// 其他比SyncLine优先级低的优先级
		// 或者是NoLane
		ensureRootScheduled(root);
		return;
	}

	if (__DEV__) {
		console.warn('render阶段开始');
	}

	// 初始化
	prepareFreshStake(root, lane);

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
	root.finishedLane = lane;
	workingProgressLane = NoLane;

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
	const lane = root.finishedLane;

	if (lane === NoLane && __DEV__) {
		console.error('commit阶段finishedLane不应该是NoLane');
	}

	// 重置操作
	root.finishedWork = null;
	root.finishedLane = NoLane;

	markRootFinished(root, lane);

	if (
		(finishedWork.flags & PassiveMask) !== NoFlags ||
		(finishedWork.subTreeFlags & PassiveMask) !== NoFlags
	) {
		// 表示当前函数组件存在useEffect回调需要执行
		if (!rootDoesHasPassiveEffects) {
			rootDoesHasPassiveEffects = true;
			// 调度副作用
			scheduleCallback(NormalPriority, () => {
				// 执行副作用
				flushPassiveEffects(root.pendingPassiveEffect);
				return;
			});
		}
	}

	// 判断是否存在三个子阶段需要执行的操作
	// root flags subTreeFlags
	const subTreeHasEffects =
		(finishedWork.subTreeFlags & MutationMask) !== NoFlags;
	const rootHasEffects = (finishedWork.flags & MutationMask) !== NoFlags;

	if (subTreeHasEffects || rootHasEffects) {
		// beforeMutation
		// mutation
		commitMutationEffects(finishedWork, root);
		root.current = finishedWork;
		// layout
	} else {
		root.current = finishedWork;
	}

	rootDoesHasPassiveEffects = false;
	ensureRootScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffect: PendingPassiveEffect) {
	pendingPassiveEffect.unmount.forEach((effect) => {
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffect.unmount = [];

	pendingPassiveEffect.update.forEach((effect) => {
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});

	pendingPassiveEffect.update.forEach((effect) => {
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffect.update = [];

	// 执行的过程中可能存在新的useEffect 所以需要再次执行一遍
	flushSyncCallback();
}

function workLoop() {
	// TODO: 实现 workLoop
	while (workingProgress !== null) {
		performUnitWork(workingProgress);
	}
}

function performUnitWork(fiber: FiberNode) {
	// 开始递
	const next = beginWork(fiber, workingProgressLane);
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
