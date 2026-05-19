/**
 * [+ 行程单] Shadow DOM 注入按钮组件
 *
 * 特性：
 * - Shadow DOM 隔离，不受宿主页面样式影响
 * - 携程蓝 #0086F6 圆角胶囊样式
 * - 点击后通过 chrome.runtime.sendMessage 发送 ADD_ITEM
 * - 防重复：注入成功后按钮变为 ✓ 已添加
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import type { CartItem, AddItemMessage } from '../shared/types';

// ─── 样式 ─────────────────────────────────────────────────────────────────────

const BUTTON_STYLES = `
  .tc-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-weight: 500;
    line-height: 1;
    border: none;
    border-radius: 100px;
    cursor: pointer;
    color: #fff;
    background-color: #0086F6;
    box-shadow: 0 2px 6px rgba(0, 134, 246, 0.3);
    transition: all 0.2s ease;
    white-space: nowrap;
    user-select: none;
    outline: none;
  }
  .tc-btn:hover {
    background-color: #006fd6;
    box-shadow: 0 4px 12px rgba(0, 134, 246, 0.4);
    transform: translateY(-1px);
  }
  .tc-btn:active {
    transform: translateY(0);
    box-shadow: 0 1px 3px rgba(0, 134, 246, 0.3);
  }
  .tc-btn--added {
    background-color: #52c41a;
    box-shadow: 0 2px 6px rgba(82, 196, 26, 0.3);
    cursor: default;
    pointer-events: none;
  }
  .tc-btn--loading {
    opacity: 0.7;
    cursor: wait;
    pointer-events: none;
  }
`;

// ─── React 组件 ───────────────────────────────────────────────────────────────

type ButtonState = 'idle' | 'loading' | 'added' | 'error';

interface InjectButtonProps {
  extractData: () => Omit<CartItem, 'id' | 'addedAt' | 'priceUpdatedAt'>;
}

const InjectButton: React.FC<InjectButtonProps> = ({ extractData }) => {
  const [state, setState] = React.useState<ButtonState>('idle');

  // Listen for ITEM_REMOVED from background to reset button state
  React.useEffect(() => {
    const listener = (message: { action: string; payload?: any }) => {
      if (message.action === 'ITEM_REMOVED') {
        // Reset this button since item was removed
        // We reset all 'added' buttons matching the removed item
        // Since we don't track exact id match in content script, reset if currently 'added'
        if (state === 'added') {
          setState('idle');
          console.log('[travel-cart][button] Reset to idle due to ITEM_REMOVED');
        }
      }
    };
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, [state]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (state === 'added' || state === 'loading') return;

    setState('loading');

    try {
      const data = extractData();
      console.log('[travel-cart][button] Click payload:', data);

      // 通过 chrome.runtime.sendMessage 发送到 Background
      const message: AddItemMessage = {
        action: 'ADD_ITEM',
        payload: data,
      };

      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        await chrome.runtime.sendMessage(message);
      } else {
        // 开发环境回退：使用 window.postMessage
        window.postMessage({ type: 'TRAVEL_CART_ADD_ITEM', ...message }, '*');
        console.log('[travel-cart] ADD_ITEM (dev mode):', data);
      }

      setState('added');
    } catch (err) {
      console.error('[travel-cart] Failed to add item:', err);
      setState('error');
      // 3 秒后恢复
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const label = {
    idle: '+ 行程单',
    loading: '添加中…',
    added: '✓ 已添加',
    error: '✗ 失败',
  }[state];

  const className = [
    'tc-btn',
    state === 'added' && 'tc-btn--added',
    state === 'loading' && 'tc-btn--loading',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={className} onClick={handleClick} title="添加到行程单">
      {label}
    </button>
  );
};

// ─── Shadow DOM 注入函数 ──────────────────────────────────────────────────────

/**
 * 将 [+ 行程单] 按钮注入到目标元素中
 * 使用 Shadow DOM 隔离样式，避免被宿主页面 CSS 干扰
 *
 * @param target - 注入锚点元素
 * @param extractData - 提取数据的回调函数
 * @returns 清理函数（可选调用以移除按钮）
 */
export function injectButton(
  target: Element,
  extractData: () => Omit<CartItem, 'id' | 'addedAt' | 'priceUpdatedAt'>
): () => void {
  // 创建宿主容器
  const host = document.createElement('div');
  host.className = 'travel-cart-inject';
  host.style.display = 'inline-block';
  host.style.marginLeft = '8px';
  host.style.verticalAlign = 'middle';

  // 创建 Shadow DOM（closed 模式，完全隔离）
  const shadow = host.attachShadow({ mode: 'closed' });

  // 注入隔离样式
  const style = document.createElement('style');
  style.textContent = BUTTON_STYLES;
  shadow.appendChild(style);

  // React 挂载容器
  const container = document.createElement('div');
  container.style.display = 'inline-block';
  shadow.appendChild(container);

  // 注入到 DOM
  target.appendChild(host);

  // 渲染 React 按钮
  const root = createRoot(container);
  root.render(<InjectButton extractData={extractData} />);

  // 返回清理函数
  return () => {
    root.unmount();
    host.remove();
  };
}

export default InjectButton;
