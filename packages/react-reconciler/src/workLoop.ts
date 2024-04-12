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
	SyncLane,
	getHighestPriority,
	lanesToSchedulePriority,
	markRootFinished,
	mergeLanes
} from './fiberLane';
import { flushSyncCallback, scheduleSyncCallback } from './syncTaskQueue';
import { HostRoot } from './workTags';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority,
	unstable_shouldYield as shouldYield,
	unstable_cancelCallback as cancelCallback
} from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

let workingProgress: FiberNode | null = null;
let workingProgressLane = NoLane;
let rootDoesHasPassiveEffects = false;

type RootExitStatus = number;
const RootInComplete = 1; // 中断执行
const RootCompleted = 2; // 执行完毕
// TODO 执行过程中报错

// 前置操作
function prepareFreshStake(root: FiberRootNode, lane: Lane) {
	root.finishedLane = NoLane;
	root.finishedWork = null;
	workingProgress = createWorkInProgress(root.current, {});
	workingProgressLane = lane;
}

// 入口
export function scheduleUpdateFiber(fiber: FiberNode, lane: Lane) {
	// 调度功能
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdate(root, lane);
	ensureRootScheduled(root);
}

// 保证我们的任务被调度
function ensureRootScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriority(root.pendingLanes);
	const existingCallback = root.callbackNode;

	if (updateLane === NoLane) {
		if (existingCallback !== null) {
			cancelCallback(existingCallback);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

	const curPriority = updateLane;
	const prePriority = root.callbackPriority;

	if (curPriority === prePriority) {
		return;
	}

	// 更高优先级的任务 取消之前的任务
	if (existingCallback !== null) {
		cancelCallback(existingCallback);
	}

	let newCallbackNode = null;

	if (updateLane === SyncLane) {
		// 同步优先级 用微任务调度
		if (__DEV__) {
			console.log('在微任务中调度, 优先级:', updateLane);
		}

		scheduleSyncCallback(performSyncOnRoot.bind(null, root));
		scheduleMicroMask(flushSyncCallback);
	} else {
		// 其他优先级 用 scheduler 库任务调度
		const schedulerPriority = lanesToSchedulePriority(updateLane);
		newCallbackNode = scheduleCallback(
			schedulerPriority,
			performConcurrentOnRoot.bind(null, root)
		);
	}

	root.callbackNode = newCallbackNode;
	root.callbackPriority = curPriority;
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

function performSyncOnRoot(root: FiberRootNode) {
	const nextLane = getHighestPriority(root.pendingLanes);
	if (nextLane !== SyncLane) {
		// 其他比SyncLane优先级低的优先级
		// 或者是NoLane
		ensureRootScheduled(root);
		return;
	}

	const exitStatus = renderRoot(root, nextLane, false);

	if (exitStatus === RootCompleted) {
		// 执行完需要做的
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLane = nextLane;
		workingProgressLane = NoLane;

		// wip fiberNode树
		commitRoot(root);
	} else if (__DEV__) {
		console.error('还未实现同步更新结束状态');
	}
}

function performConcurrentOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): any {
	// 保证 useEffect 已经执行
	const curCallback = root.callbackNode;
	const didFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffect);

	if (didFlushPassiveEffect) {
		if (root.callbackNode !== curCallback) {
			// 说明在执行useEffect的时候插入了一个更高优先级的任务 所以不需要继续执行了
			return null;
		}
	}

	const lane = getHighestPriority(root.pendingLanes);
	const curCallbackNode = root.callbackNode;
	if (lane === NoLane) {
		return;
	}
	const needSync = lane === SyncLane || didTimeout;
	// render 阶段
	const exitStatus = renderRoot(root, lane, !needSync);

	ensureRootScheduled(root);

	if (exitStatus === RootInComplete) {
		// 中断
		if (root.callbackNode !== curCallbackNode) {
			// 表示有更高优先级的任务插入 停止继续调度
			return;
		}
		return performConcurrentOnRoot.bind(null, root);
	}

	if (exitStatus === RootCompleted) {
		// 执行完需要做的
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLane = lane;
		workingProgressLane = NoLane;

		// wip fiberNode树
		commitRoot(root);
	} else if (__DEV__) {
		console.error('还未实现并发更新结束状态');
	}
}

function renderRoot(
	root: FiberRootNode,
	lane: Lane,
	shouldSlice: boolean
): RootExitStatus {
	if (__DEV__) {
		console.log(`开始${shouldSlice ? '并发' : '同步'}更新`, root);
	}

	// 上一次优先级不等于当前正在执行的任务优先级
	if (workingProgressLane !== lane) {
		// 初始化
		prepareFreshStake(root, lane);
	}

	do {
		try {
			shouldSlice ? workLoopConcurrent() : workLoopSync();
			break;
		} catch (error) {
			if (__DEV__) {
				console.warn('workLoop error', error);
			}

			workingProgress = null;
		}
	} while (true);

	// 中断执行
	if (shouldSlice && workingProgress !== null) {
		return RootInComplete;
	}
	// 执行完
	if (!shouldSlice && workingProgress !== null && __DEV__) {
		console.error('render阶段结束时，workingProgress不应该不是null');
	}

	// TODO 报错
	return RootCompleted;
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
	let didFlushPassiveEffect = false;
	pendingPassiveEffect.unmount.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffect.unmount = [];

	pendingPassiveEffect.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});

	pendingPassiveEffect.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffect.update = [];

	// 执行的过程中可能存在新的useEffect 所以需要再次执行一遍
	flushSyncCallback();
	return didFlushPassiveEffect;
}

function workLoopSync() {
	while (workingProgress !== null) {
		performUnitWork(workingProgress);
	}
}
function workLoopConcurrent() {
	// shouldYield 应该被中断, !shouldYield 应该继续
	while (workingProgress !== null && !shouldYield) {
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
