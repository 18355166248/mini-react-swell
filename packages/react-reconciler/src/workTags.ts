export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText
	| typeof Fragment;

export const FunctionComponent = 0;
export const HostRoot = 3;

// div节点
export const HostComponent = 5;
// div节点内的内容 <div>123</div>
export const HostText = 6;
export const Fragment = 7;
