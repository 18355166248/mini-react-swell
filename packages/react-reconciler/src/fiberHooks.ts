import { Dispatcher, Dispatch } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import internals from 'shared/internals';
import {
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdateQueue
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateFiber } from './workLoop';

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;

const { currentDispatcher } = internals;

interface Hook {
	memorizedState: any;
	updateQueue: unknown;
	next: Hook | null;
}

export function renderWithHooks(wip: FiberNode) {
	// 赋值操作
	currentlyRenderingFiber = wip;
	// 重置
	wip.memorizedState = null;

	const current = wip.alternate;
	if (current !== null) {
		// update
		currentDispatcher.current = HooksDispatcherOnUpdate;
	} else {
		// mount
		currentDispatcher.current = HooksDispatcherOnMount;
	}

	const Component = wip.type;
	const props = wip.pendingProps;
	// FC render时机
	const child = Component(props);

	// 重置操作
	currentlyRenderingFiber = null;
	workInProgressHook = null;
	currentHook = null;

	return child;
}

// 初始化时dispatch
const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
};
// 更新时dispatch
const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState
};

function mountState<State>(
	initialState: () => State | State
): [State, Dispatch<State>] {
	// 找到当前useState对应的hook数据
	const hook = mountWorkInProgressHook();

	let memorizedState;
	if (typeof initialState === 'function') {
		memorizedState = initialState();
	} else {
		memorizedState = initialState;
	}

	const queue = createUpdateQueue<State>();
	hook.updateQueue = queue;
	hook.memorizedState = memorizedState;

	// bind 让该方法可以在函数组件外部正常调用
	const dispatch = (queue.dispatch = dispatchSetState.bind(
		null,
		currentlyRenderingFiber as FiberNode,
		queue as any
	));
	return [memorizedState, dispatch];
}

function updateState<State>(): [State, Dispatch<State>] {
	// 找到当前useState对应的hook数据
	const hook = updateWorkInProgressHook();

	// 计算新state的逻辑
	const queue = hook.updateQueue as UpdateQueue<State>;
	const pending = queue.shared.pending;

	if (pending !== null) {
		const { memorizedState } = processUpdateQueue(hook.memorizedState, pending);
		hook.memorizedState = memorizedState;
	}

	return [hook.memorizedState, queue.dispatch as Dispatch<State>];
}

function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memorizedState: null,
		updateQueue: null,
		next: null
	};
	if (workInProgressHook === null) {
		// mount时 第一个hooks
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件内调用hook');
		} else {
			workInProgressHook = hook;
			currentlyRenderingFiber.memorizedState = workInProgressHook;
		}
	} else {
		// mount时 下一个hook
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}

	return workInProgressHook;
}

function updateWorkInProgressHook(): Hook {
	// TODO render阶段触发的更新
	let nextCurrentHooks: Hook | null;
	if (currentHook === null) {
		// FC update 时第一个hook
		const current = currentlyRenderingFiber?.alternate;
		if (current !== null) {
			nextCurrentHooks = current?.memorizedState;
		} else {
			nextCurrentHooks = null;
		}
	} else {
		// 更新时下一个hook
		nextCurrentHooks = currentHook.next;
	}

	if (nextCurrentHooks === null) {
		// mount/update u1 u2 u3
		// update 			u1 u2 u3 u4
		throw new Error(
			`组件${currentlyRenderingFiber?.type}本次执行时的hook比上次多`
		);
	}

	currentHook = nextCurrentHooks as Hook;

	const newHook: Hook = {
		memorizedState: currentHook.memorizedState,
		updateQueue: currentHook.updateQueue,
		next: null
	};

	if (workInProgressHook === null) {
		// update时 第一个hooks
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件内调用hook');
		} else {
			workInProgressHook = newHook;
			currentlyRenderingFiber.memorizedState = workInProgressHook;
		}
	} else {
		// update时 下一个hook
		workInProgressHook.next = newHook;
		workInProgressHook = newHook;
	}

	return workInProgressHook;
}

function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>
) {
	const update = createUpdate(action);
	enqueueUpdate(updateQueue, update);
	scheduleUpdateFiber(fiber);
}
