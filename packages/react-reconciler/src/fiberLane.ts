import {
	unstable_IdlePriority,
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority,
	unstable_getCurrentPriorityLevel
} from 'scheduler';
import { FiberRootNode } from './fiber';

export type Lane = number;
export type Lanes = number;

export const SyncLine = 0b0001;
export const NoLane = 0b0000;
export const NoLanes = 0b0000;
export const InputContinuesLane = 0b0010;
export const DefaultLane = 0b0100;
export const IdleLane = 0b1000;

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
	return laneA | laneB;
}

// 这里获取的优先级是基于事件(react-dom/src/SynthesisEvent.ts)生成的值
export function requestUpdateLanes() {
	// 从上下文环境中获取 scheduler 优先级
	const currentPriorityLevel = unstable_getCurrentPriorityLevel();
	const lane = schedulePriorityToLane(currentPriorityLevel);
	return lane;
}

export function getHighestPriority(lanes: Lanes) {
	return lanes & -lanes;
}

// 移除lane
export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane;
}

export function lanesToSchedulePriority(lanes: Lanes) {
	const lane = getHighestPriority(lanes);
	if (lane === SyncLine) {
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
		return SyncLine;
	}
	if (schedulerPriority === unstable_UserBlockingPriority) {
		return InputContinuesLane;
	}
	if (schedulerPriority === unstable_NormalPriority) {
		return DefaultLane;
	}
	return NoLane;
}
