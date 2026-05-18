import type { ExtensionMessage } from './types';

/**
 * 发送消息到 background service worker
 */
export function sendToBackground(message: ExtensionMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}

/**
 * 发送消息到指定 tab 的 content script
 */
export function sendToTab(tabId: number, message: ExtensionMessage): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, message);
}

/**
 * 监听消息
 */
export function onMessage(
  handler: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => void | boolean
): void {
  chrome.runtime.onMessage.addListener(handler);
}
