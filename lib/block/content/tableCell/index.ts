import ScrollPage from "@muya/block";
import Format from "@muya/block/base/format";
import Table from "@muya/block/gfm/table";
import Cell from "@muya/block/gfm/table/cell";
import Row from "@muya/block/gfm/table/row";
import TableInner from "@muya/block/gfm/table/table";
import { EVENT_KEYS, isOsx } from "@muya/config";
import Muya from "@muya/index";
import { Cursor } from "@muya/selection/types";
import { isKeyboardEvent } from "@muya/utils";

class TableCellContent extends Format {
  static blockName = "table.cell.content";

  static create(muya: Muya, text: string) {
    const content = new TableCellContent(muya, text);

    return content;
  }

  get table() {
    return this.closestBlock("table") as Table;
  }

  get tableInner() {
    return this.closestBlock("table.inner") as TableInner;
  }

  get row() {
    return this.closestBlock("table.row") as Row;
  }

  get cell() {
    return this.closestBlock("table.cell") as Cell;
  }

  constructor(muya: Muya, text: string) {
    super(muya, text);
    this.classList = [...this.classList, "mu-table-cell-content"];
    this.createDomNode();
  }

  getAnchor() {
    return this.table;
  }

  update(cursor: Cursor, highlights = []) {
    return this.inlineRenderer.patch(this, cursor, highlights);
  }

  findNextRow() {
    const { row } = this;

    return row.next || null;
  }

  findPreviousRow() {
    const { row } = this;

    return row.prev || null;
  }

  shiftEnter(event: Event) {
    event.preventDefault();

    const { start, end } = this.getCursor()!;
    const { text } = this;

    const br = "<br/>";

    this.text =
      text.substring(0, start.offset) + br + text.substring(end.offset);
    const offset = start.offset + br.length;
    this.setCursor(offset, offset, true);
  }

  commandEnter(event: Event) {
    event.preventDefault();

    const offset = this.tableInner.offset(this.row);
    const cursorBlock = this.table.insertRow(
      offset + 1 /* Because insert after the current row */
    );
    cursorBlock.setCursor(0, 0);
  }

  normalEnter(event: Event) {
    event.preventDefault();

    const nextRow = this.findNextRow();
    const { row } = this;
    let cursorBlock = null;
    if (nextRow) {
      cursorBlock = nextRow.firstContentInDescendant();
    } else {
      const lastCellContent = row.lastContentInDescendant();
      const nextContent = lastCellContent.nextContentInContext();
      if (nextContent) {
        cursorBlock = nextContent;
      } else {
        const state = {
          name: "paragraph",
          text: "",
        };

        const newParagraphBlock = ScrollPage.loadBlock("paragraph").create(
          this.muya,
          state
        );
        this.scrollPage.append(newParagraphBlock, "user");
        cursorBlock = newParagraphBlock.firstContentInDescendant();
      }
    }

    cursorBlock.setCursor(0, 0, true);
  }

  enterHandler(event: Event) {
    if (!isKeyboardEvent(event)) {
      return;
    }
    if (event.shiftKey) {
      return this.shiftEnter(event);
    } else if ((isOsx && event.metaKey) || (!isOsx && event.ctrlKey)) {
      return this.commandEnter(event);
    } else {
      return this.normalEnter(event);
    }
  }

  arrowHandler(event: Event) {
    if (!isKeyboardEvent(event)) {
      return;
    }
    const previousRow = this.findPreviousRow();
    const nextRow = this.findNextRow();
    const { table, cell, row } = this;
    const offset = row.offset(cell);
    const tablePrevContent = table.prev
      ? table.prev.lastContentInDescendant()
      : null;
    const tableNextContent = table.next
      ? table.next.firstContentInDescendant()
      : null;

    if (event.key === EVENT_KEYS.ArrowUp) {
      event.preventDefault();
      if (previousRow) {
        const cursorBlock = (previousRow.find(offset) as Cell).firstContentInDescendant();
        const cursorOffset = cursorBlock.text.length;
        cursorBlock.setCursor(cursorOffset, cursorOffset, true);
      } else if (tablePrevContent) {
        const cursorOffset = tablePrevContent.text.length;
        tablePrevContent.setCursor(cursorOffset, cursorOffset, true);
      }
    } else if (event.key === EVENT_KEYS.ArrowDown) {
      event.preventDefault();

      if (nextRow) {
        const cursorBlock = (nextRow.find(offset) as Cell).firstContentInDescendant();
        cursorBlock.setCursor(0, 0, true);
      } else {
        let cursorBlock = null;
        if (tableNextContent) {
          cursorBlock = tableNextContent;
        } else {
          const state = {
            name: "paragraph",
            text: "",
          };

          const newParagraphBlock = ScrollPage.loadBlock("paragraph").create(
            this.muya,
            state
          );
          this.scrollPage.append(newParagraphBlock, "user");
          cursorBlock = newParagraphBlock.firstContentInDescendant();
        }

        cursorBlock.setCursor(0, 0, true);
      }
    } else {
      super.arrowHandler(event);
    }
  }

  backspaceHandler(event: Event) {
    const { start, end } = this.getCursor()!;
    const previousContentBlock = this.previousContentInContext();

    if (start.offset !== 0 || start.offset !== end.offset) {
      return super.backspaceHandler(event);
    }

    event.preventDefault();
    event.stopPropagation();

    if (
      !previousContentBlock ||
      (previousContentBlock.blockName !== "table.cell.content" &&
        this.table.isEmpty)
    ) {
      const state = {
        name: "paragraph",
        text: "",
      };
      const newParagraphBlock = ScrollPage.loadBlock("paragraph").create(
        this.muya,
        state
      );
      this.table.replaceWith(newParagraphBlock);
      newParagraphBlock.firstChild.setCursor(0, 0);
    } else {
      const offset = previousContentBlock.text.length;
      previousContentBlock.setCursor(offset, offset, true);
    }
  }

  tabHandler(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const nextContentBlock = this.nextContentInContext();

    if (nextContentBlock) {
      nextContentBlock.setCursor(0, 0, true);
    }
  }
}

export default TableCellContent;
