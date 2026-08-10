import type { CodeFile } from '@dd/shared';

export interface TreeFile {
  kind: 'file';
  name: string;
  path: string;
  file: CodeFile;
}

export interface TreeFolder {
  kind: 'folder';
  name: string;
  path: string;
  children: TreeNode[];
}

export type TreeNode = TreeFile | TreeFolder;

/**
 * The API sends a flat list of paths; the explorer needs a tree. Building it here rather
 * than in the component keeps FileTreeItem purely presentational and makes this testable.
 *
 * Folders sort before files, then alphabetically — the ordering every IDE uses, so the
 * tree reads the way a developer expects rather than the way the database returned it.
 */
export function buildFileTree(files: CodeFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    const fileName = segments.pop();
    if (!fileName) continue;

    let level = root;
    let prefix = '';

    for (const segment of segments) {
      prefix = prefix ? `${prefix}/${segment}` : segment;
      let folder = level.find(
        (node): node is TreeFolder => node.kind === 'folder' && node.name === segment,
      );
      if (!folder) {
        folder = { kind: 'folder', name: segment, path: prefix, children: [] };
        level.push(folder);
      }
      level = folder.children;
    }

    level.push({ kind: 'file', name: fileName, path: file.path, file });
  }

  return sortNodes(root);
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.kind === 'folder') sortNodes(node.children);
  }
  return nodes;
}
