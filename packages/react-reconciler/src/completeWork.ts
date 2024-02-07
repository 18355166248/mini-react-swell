// JSX消费的顺序 是以DFS（深度优先遍历）的顺序遍历ReactElement

import { FiberNode } from './fiber';

// completeWork 就是递归的归阶段
export const completeWork = (fiber: FiberNode) => {};
