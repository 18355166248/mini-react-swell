import { Key, Props, Ref } from 'shared/ReactTypes';
import { WorkTag } from './workTags';
import { Flags, NoFlags } from './fiberFlags';

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
	// 替补节点 current和workingProgress相互切换
	alternate: FiberNode | null;
	flags: Flags; // 标记 是新增还是删除还是更新还是不变

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

		this.alternate = null;
		// 副作用
		this.flags = NoFlags;
	}
}
