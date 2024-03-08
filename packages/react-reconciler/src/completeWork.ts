// JSX消费的顺序 是以DFS（深度优先遍历）的顺序遍历ReactElement

import {
	Container,
	appendInitialChild,
	createInstance,
	createTextInstance
} from 'hostConfig';
import { FiberNode } from './fiber';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';
import { NoFlags, Update } from './fiberFlags';
import { updateFiberProps } from 'react-dom/src/SynthesisEvent';

function markUpdate(fiber: FiberNode) {
	fiber.flags |= Update;
}

// completeWork 就是递归的归阶段
export const completeWork = (wip: FiberNode) => {
	const newProps = wip.pendingProps;
	const current = wip.alternate;

	switch (wip.tag) {
		case HostRoot:
			bubbleProperties(wip);
			break;
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// update
				// 1. props是否有变化
				// 2. 变了 打update标记
				// TODO 针对所有有变化的值打update标记

				// TODO 临时方案
				updateFiberProps(wip.stateNode, newProps);
			} else {
				// 1.构建Dom
				const instance = createInstance(wip.type, newProps);
				// 2.将Dom插入Dom树中
				appendAllChildren(instance, wip);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			break;
		case HostText:
			if (current !== null && wip.stateNode) {
				// update
				const oldText = current.memoizedProps.content;
				const newText = newProps.content;
				if (oldText !== newText) {
					markUpdate(wip);
				}
			} else {
				// 1.构建Dom
				const instance = createTextInstance(newProps.content);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			break;
		case FunctionComponent:
			bubbleProperties(wip);
			break;
		default:
			if (__DEV__) {
				console.warn('未处理的completeWork情况', wip);
			}
			break;
	}
};

function appendAllChildren(parent: Container, wip: FiberNode) {
	let node = wip.child;

	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(parent, node?.stateNode);
		} else if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === wip) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return;
			}
			node = node?.return;
		}

		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function bubbleProperties(wip: FiberNode) {
	let subTreeFlags = NoFlags;
	let child = wip.child;

	while (child !== null) {
		subTreeFlags |= child.subTreeFlags;
		subTreeFlags |= child.flags;

		child.return = wip;
		child = child.sibling;
	}

	wip.subTreeFlags |= subTreeFlags;
}
