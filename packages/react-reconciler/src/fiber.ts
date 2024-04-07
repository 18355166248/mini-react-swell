import { Key, Props, ReactElementType, Ref } from 'shared/ReactTypes';
import {
	FunctionComponent,
	HostComponent,
	WorkTag,
	Fragment
} from './workTags';
import { Flags, NoFlags } from './fiberFlags';
import { Container } from 'hostConfig';
import { Lane, Lanes, NoLane, NoLanes } from './fiberLane';
import { Effect } from './fiberHooks';

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
	index: number;

	// 缓存的props
	memoizedProps: Props | null;
	memorizedState: any;
	// 替补节点 current和workingProgress相互切换
	alternate: FiberNode | null;
	flags: Flags; // 标记 是新增还是删除还是更新还是不变
	subTreeFlags: Flags; // 标记子树是否需要更新
	deletions: FiberNode[] | null; // 标记删除的节点
	updateQueue: unknown;

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.tag = tag;
		this.pendingProps = pendingProps;
		this.key = key || null;
		// HostComponent <div></div> Dom
		this.stateNode = null;
		// FuncComponent function () {}
		this.type = null;

		// 构成树状结构
		this.return = null;
		this.sibling = null;
		this.child = null;
		this.index = 0;

		this.ref = null;

		// 作为工作单元
		this.pendingProps = pendingProps;
		this.memoizedProps = null;
		this.memorizedState = null;
		this.updateQueue = null;

		this.alternate = null;
		// 副作用
		this.flags = NoFlags;
		this.subTreeFlags = NoFlags;
		this.deletions = null;
	}
}

export interface PendingPassiveEffect {
	unmount: Effect[];
	update: Effect[];
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	pendingLanes: Lanes;
	finishedLane: Lane;
	// 收集的 useEffect 回调集合
	pendingPassiveEffect: PendingPassiveEffect;

	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
		this.pendingLanes = NoLanes;
		this.finishedLane = NoLane;
		this.pendingPassiveEffect = {
			unmount: [],
			update: []
		};
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
		wip.subTreeFlags = NoFlags;
		wip.deletions = null;
	}

	wip.type = current.type;
	wip.updateQueue = current.updateQueue;
	wip.child = current.child;
	wip.memoizedProps = current.memoizedProps;
	wip.memorizedState = current.memorizedState;

	return wip;
};

export function createFiberFromElement(element: ReactElementType): FiberNode {
	const { type, key, props } = element;
	let fiberTag: WorkTag = FunctionComponent;

	if (typeof type === 'string') {
		fiberTag = HostComponent;
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未定义的type类型', element);
	}

	const fiber = new FiberNode(fiberTag, props, key);
	fiber.type = type;
	return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
	return new FiberNode(Fragment, elements, key);
}
