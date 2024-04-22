import {
	unstable_IdlePriority,
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority,
	unstable_getCurrentPriorityLevel
} from 'scheduler';
import { FiberRootNode } from './fiber';
import ReactCurrentBatchConfig from 'react/src/currentBatchConfig';

export type Lane = number;
export type Lanes = number;

export const NoLane = 0b00000;
export const NoLanes = 0b00000;
export const SyncLane = 0b00001;
export const InputContinuesLane = 0b00010;
export const DefaultLane = 0b00100;
export const TransitionLane = 0b01000;
export const IdleLane = 0b10000;

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
	return laneA | laneB;
}

// 这里获取的优先级是基于事件(react-dom/src/SynthesisEvent.ts)生成的值
export function requestUpdateLanes() {
	const isTransition = ReactCurrentBatchConfig.transition !== null;
	if (isTransition) {
		return TransitionLane;
	}
	// 从上下文环境中获取 scheduler 优先级
	const currentPriorityLevel = unstable_getCurrentPriorityLevel();
	const lane = schedulePriorityToLane(currentPriorityLevel);
	return lane;
}

export function getHighestPriority(lanes: Lanes) {
	return lanes & -lanes;
}

export function isSubsetOfLanes(sets: Lanes, subset: Lane) {
	return (subset & sets) === subset;
}

// 移除lane
export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane;
}

export function lanesToSchedulePriority(lanes: Lanes) {
	const lane = getHighestPriority(lanes);
	if (lane === SyncLane) {
		return unstable_ImmediatePriority;
	}
	if (lane === InputContinuesLane) {
		return unstable_UserBlockingPriority;
	}
	if (lane === DefaultLane) {
		return unstable_NormalPriority;
	}
	return unstable_IdlePriority;
}

export function schedulePriorityToLane(schedulerPriority: number): Lane {
	if (schedulerPriority === unstable_ImmediatePriority) {
		return SyncLane;
	}
	if (schedulerPriority === unstable_UserBlockingPriority) {
		return InputContinuesLane;
	}
	if (schedulerPriority === unstable_NormalPriority) {
		return DefaultLane;
	}
	return NoLane;
}
