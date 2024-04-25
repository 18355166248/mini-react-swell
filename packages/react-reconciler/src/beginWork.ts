// JSX消费的顺序 是以DFS（深度优先遍历）的顺序遍历ReactElement

import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { UpdateQueue, processUpdateQueue } from './updateQueue';
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';
import { mountChildFibers, reconcilerChildFibers } from './childFibers';
import { renderWithHooks } from './fiberHooks';
import { Lane } from './fiberLane';
import { Ref } from './fiberFlags';

// beginWork 就是递归的递阶段
export const beginWork = (
	wip: FiberNode,
	renderLane: Lane
): FiberNode | null => {
	// 比较 返回子 fiberNode
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip, renderLane);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;
		case FunctionComponent:
			return updateFunctionComponent(wip, renderLane);
		case Fragment:
			return updateFragment(wip);
		default:
			if (__DEV__) {
				console.warn('beginWork未实现的类型');
			}
	}
	return null;
};

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
	const baseState = wip.memorizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	updateQueue.shared.pending = null;
	const { memorizedState } = processUpdateQueue(baseState, pending, renderLane);
	wip.memorizedState = memorizedState;

	const nextChildren = wip.memorizedState;
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}

function updateHostComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	markRef(wip.alternate, wip);
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
	const nextChildren = renderWithHooks(wip, renderLane);
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}

function updateFragment(wip: FiberNode) {
	const nextChildren = wip.pendingProps;
	reconcilerChildren(wip, nextChildren);
	return wip.child;
}

function reconcilerChildren(wip: FiberNode, children?: ReactElementType) {
	const current = wip.alternate;

	if (current !== null) {
		// update
		wip.child = reconcilerChildFibers(wip, current?.child, children);
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, children);
	}
}

function markRef(current: FiberNode | null, workInProcess: FiberNode) {
	const ref = workInProcess.ref;
	// mount时存在ref
	// update时 ref引用变化
	if (
		(current === null && ref !== null) ||
		(current !== null && current.ref !== ref)
	) {
		workInProcess.flags |= Ref;
	}
}
