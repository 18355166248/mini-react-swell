import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { Lane, NoLane, isSubsetOfLanes } from './fiberLane';

export interface Update<State> {
	action: Action<State>;
	next: Update<any> | null;
	lane: Lane;
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(
	action: Action<State>,
	lane: Lane
): Update<State> => {
	return {
		action,
		next: null,
		lane
	};
};

export const createUpdateQueue = <State>() => {
	return {
		shared: {
			pending: null
		},
		dispatch: null
	} as UpdateQueue<State>;
};

export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	// 生成一个链表
	// pending指向的一直是最后一个update
	const pending = updateQueue.shared.pending;
	if (pending === null) {
		// a -> a
		update.next = update;
	} else {
		// b -> a -> b
		// b.next = a.next
		update.next = pending.next;
		// a.next = b
		pending.next = update;
	}
	// pending = b
	updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
): {
	memorizedState: State;
	baseState: State;
	baseQueue: Update<State> | null;
} => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memorizedState: baseState,
		baseState,
		baseQueue: null
	};
	if (pendingUpdate !== null) {
		// 第一个update
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<any>;

		// 如果被跳过 这里将被固定
		let newBaseState = baseState;
		let newBaseQueueFirst: Update<any> | null = null;
		let newBaseQueueLast: Update<any> | null = null;
		let newState = baseState;

		do {
			const updateLane = pending.lane;
			if (!isSubsetOfLanes(updateLane, renderLane)) {
				// 优先级不够 被跳过
				const clone = createUpdate(pending.action, pending.lane);
				// 是不是第一个被跳过
				if (newBaseQueueFirst === null) {
					newBaseQueueFirst = clone;
					newBaseQueueLast = clone;
					newBaseState = newState;
				} else {
					(newBaseQueueLast as Update<State>).next = clone;
					newBaseQueueLast = clone;
				}
			} else {
				// 优先级足够
				if (newBaseQueueLast !== null) {
					const clone = createUpdate(pending.action, NoLane);
					(newBaseQueueLast as Update<State>).next = clone;
					newBaseQueueLast = clone;
				}

				const action = pendingUpdate.action;
				if (action instanceof Function) {
					// baseState 1 update 2 memorizedState 2
					newState = action(baseState);
				} else {
					// baseState 1 update (x) => 4x -> memorizedState 4
					newState = action;
				}
			}

			pending = pending.next as Update<any>;
		} while (pending !== first);

		if (newBaseQueueLast === null) {
			// 本次计算没有update被跳过
			newBaseState = newState;
		} else {
			// 形成环状链表
			newBaseQueueLast.next = newBaseQueueFirst;
		}

		result.memorizedState = newState;
		result.baseState = newBaseState;
		result.baseQueue = newBaseQueueLast;
	}

	return result;
};
