// JSX消费的顺序 是以DFS（深度优先遍历）的顺序遍历ReactElement

import { FiberNode } from './fiber';

// beginWork 就是递归的递阶段
export const beginWork = (fiber: FiberNode): FiberNode | null => {
	// 比较 返回子 fiberNode
	console.log(fiber);
};
