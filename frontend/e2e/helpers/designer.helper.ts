import { type Page, type Locator, expect } from '@playwright/test';

export class DesignerHelper {
  readonly page: Page;
  readonly canvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('.react-flow');
  }

  node(name: string): Locator {
    return this.page.locator(`.react-flow__node[data-id="${name}"]`);
  }

  get allNodes(): Locator {
    return this.page.locator('.react-flow__node');
  }

  get allEdges(): Locator {
    return this.page.locator('.react-flow__edge');
  }

  async clickNode(name: string) {
    await this.node(name).click();
  }

  async clickCanvas() {
    // Click the ReactFlow pane (background area) to deselect
    await this.page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
  }

  async clickEdge(index = 0) {
    // ReactFlow edge click handler is on the SVG <g> container.
    // We need to click the visible edge path. Force click bypasses visibility checks.
    const edge = this.allEdges.nth(index);
    await edge.dispatchEvent('click');
  }

  /** Click an edge by its aria label pattern (e.g., "Edge from X to Y") */
  async clickEdgeByLabel(sourceOrTarget: string) {
    const edge = this.page.locator(`[aria-label*="${sourceOrTarget}"]`);
    await edge.first().dispatchEvent('click');
  }

  async expectNodeCount(count: number) {
    await expect(this.allNodes).toHaveCount(count);
  }

  async expectNodeVisible(name: string) {
    await expect(this.node(name)).toBeVisible();
  }

  async expectEdgeCount(count: number) {
    await expect(this.allEdges).toHaveCount(count);
  }
}
