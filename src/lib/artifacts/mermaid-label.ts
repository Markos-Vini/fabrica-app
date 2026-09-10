/** Escapa texto para rótulos Mermaid flowchart entre colchetes. */
export function mermaidLabel(text: string): string {
  return `"${text.replace(/"/g, "'")}"`;
}

export function mermaidNode(id: string, label: string): string {
  return `${id}[${mermaidLabel(label)}]`;
}

export function mermaidDbNode(id: string, label: string): string {
  return `${id}[(${mermaidLabel(label)})]`;
}

export function mermaidEdge(from: string, to: string): string {
  return `${from} --> ${to}`;
}
