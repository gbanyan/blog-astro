import { visit } from 'unist-util-visit';

/**
 * Rehype plugin to transform GitHub-style blockquote alerts
 * Transforms: > [!NOTE] into styled callout boxes
 */
export function rehypeCallouts() {
  return (tree: any) => {
    visit(tree, 'element', (node) => {
      // Only process blockquotes
      if (node.tagName !== 'blockquote') return;
      if (!node.children || node.children.length === 0) return;

      // Find the first non-whitespace child
      let contentChild: any = null;
      for (const child of node.children) {
        if (child.type === 'text' && child.value.trim()) {
          contentChild = child;
          break;
        } else if (child.tagName === 'p') {
          contentChild = child;
          break;
        }
      }

      if (!contentChild) return;

      // Find the first text node
      let textNode: any = null;
      let textParent: any = null;

      if (contentChild.type === 'text') {
        // Direct text child
        textNode = contentChild;
        textParent = node;
      } else if (contentChild.tagName === 'p' && contentChild.children) {
        // Text inside paragraph - find first non-whitespace text
        for (const child of contentChild.children) {
          if (child.type === 'text' && child.value.trim()) {
            textNode = child;
            textParent = contentChild;
            break;
          }
        }
      }

      if (!textNode || textNode.type !== 'text') return;

      // Check if text starts with [!TYPE]
      const match = textNode.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
      if (!match) return;

      const type = match[1].toLowerCase();

      // Remove the [!TYPE] marker from the text
      textNode.value = textNode.value.replace(match[0], '').trim();

      // If the text node is now empty, remove it
      if (!textNode.value) {
        const index = textParent.children.indexOf(textNode);
        if (index > -1) {
          textParent.children.splice(index, 1);
        }
      }

      // Add callout data attributes and classes
      node.properties = node.properties || {};
      node.properties.className = ['callout', `callout-${type}`];
      node.properties['data-callout'] = type;

      // Add icon and title elements
      const iconMap: Record<string, string> = {
        note: '📝',
        tip: '💡',
        important: '❗',
        warning: '⚠️',
        caution: '🚨',
      };

      const icon = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['callout-icon'] },
        children: [{ type: 'text', value: iconMap[type] || '📝' }],
      };

      const title = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['callout-title'] },
        children: [{ type: 'text', value: type.toUpperCase() }],
      };

      const header = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['callout-header'] },
        children: [icon, title],
      };

      const content = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['callout-content'] },
        children: [...node.children],
      };

      node.children = [header, content];
    });
  };
}
