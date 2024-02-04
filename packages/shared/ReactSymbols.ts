const supportSymbol = typeof Symbol === 'function' && Symbol.for;

export const REACT_ELEMENT_TYPE = supportSymbol
	? Symbol.for('react.element')
	: 0xeac7;

// https://juejin.cn/post/6844903741280223240
// 那么如果浏览器不支持 Symbol 类型怎么办呢？
//   哎，它们确实得不到这个特别的保护机制。但 React 为了保持一致性依然会在元素中定义?typeof属性，只不过它会被设置成一个 number 类型的值——0xeac7.
//   为什么是这个特别的数字呢？因为0xeac7看起来有点像“React”。
