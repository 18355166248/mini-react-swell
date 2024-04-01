import { FiberRootNode } from './fiber';

export type Lane = number;
export type Lanes = number;

export const SyncLine = 0b0001;
export const NoLane = 0b0000;
export const NoLanes = 0b0000;

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
	return laneA | laneB;
}

export function requestUpdateLanes() {
	return SyncLine;
}

export function getHighestPriority(lanes: Lanes) {
	return lanes & -lanes;
}

// 移除lane
export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane;
}
