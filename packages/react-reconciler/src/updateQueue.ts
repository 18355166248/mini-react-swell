import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { Lane } from './fiberLane';

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
): { memorizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memorizedState: baseState
	};
	if (pendingUpdate !== null) {
		// 第一个update
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<any>;

		do {
			const updateLane = pending.lane;
			if (updateLane === renderLane) {
				const action = pendingUpdate.action;
				if (action instanceof Function) {
					// baseState 1 update 2 memorizedState 2
					baseState = action(baseState);
				} else {
					// baseState 1 update (x) => 4x -> memorizedState 4
					baseState = action;
				}
			} else {
				if (__DEV__) {
					console.warn('不应该进入updateLane !== renderLane');
				}
			}

			pending = pending.next as Update<any>;
		} while (pending !== first);

		result.memorizedState = baseState;
	}

	return result;
};
