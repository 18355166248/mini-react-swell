import currentDispatcher, {
	Dispatcher,
	resolveDispatcher
} from './src/currentDispatcher';
import {
	createElement as jsx,
	isValidElement as isValidElementFN
} from './src/jsx';

export const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initialState);
};

// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED__ = {
	currentDispatcher
};

export const version = '0.1.1';
export const createElement = jsx;
export const isValidElement = isValidElementFN;
