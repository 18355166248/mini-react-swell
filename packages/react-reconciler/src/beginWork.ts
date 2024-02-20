// JSX消费的顺序 是以DFS（深度优先遍历）的顺序遍历ReactElement

import { FiberNode } from './fiber';
import { HostComponent, HostRoot, HostText } from './workTags';

// beginWork 就是递归的递阶段
export const beginWork = (wip: FiberNode): FiberNode | null => {
	// 比较 返回子 fiberNode
	switch (wip.tag) {
		case HostRoot:
			break;

		case HostComponent:
			break;

		case HostText:
			break;

		default:
			break;
	}
};
