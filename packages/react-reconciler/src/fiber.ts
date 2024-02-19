import { Key, Props, Ref } from 'shared/ReactTypes';
import { WorkTag } from './workTags';
import { Flags, NoFlags } from './fiberFlags';
import { Container } from 'hostConfig';

export class FiberNode {
	type: any;
	tag: WorkTag;
	pendingProps: Props;
	key: Key;
	stateNode: any;
	ref: Ref;
	// 父节点
	return: FiberNode | null;
	// 靠右的兄弟节点
	sibling: FiberNode | null;
	// 子节点
	child: FiberNode | null;
	// 缓存的props
	memoizedProps: Props | null;
	memorizedState: any;
	// 替补节点 current和workingProgress相互切换
	alternate: FiberNode | null;
	flags: Flags; // 标记 是新增还是删除还是更新还是不变
	updateQueue: unknown;

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.tag = tag;
		this.pendingProps = pendingProps;
		this.key = key;
		// HostComponent <div></div> Dom
		this.stateNode = null;
		// FuncComponent function () {}
		this.type = null;

		// 构成树状结构
		this.return = null;
		this.sibling = null;
		this.child = null;

		this.ref = null;

		// 作为工作单元
		this.pendingProps = pendingProps;
		this.memoizedProps = null;
		this.memorizedState = null;
		this.updateQueue = null;

		this.alternate = null;
		// 副作用
		this.flags = NoFlags;
	}
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;

	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
	}
}

export const createWorkInProgress = (
	current: FiberNode,
	pendingProps: Props
): FiberNode => {
	let wip = current.alternate;

	if (wip === null) {
		// mount
		wip = new FiberNode(current.tag, pendingProps, current.key);
		wip.type = current.type;
		wip.stateNode = current.stateNode;

		wip.alternate = current;
		current.alternate = wip;
	} else {
		// update
		wip.pendingProps = pendingProps;
		// 副作用
		wip.flags = NoFlags;
	}

	wip.type = current.type;
	wip.updateQueue = current.updateQueue;
	wip.child = current.child;
	wip.memoizedProps = current.memoizedProps;
	wip.memorizedState = current.memorizedState;

	return wip;
};
