const { CompositeDisposable } = require("atom");

module.exports = {
  activate() {
    this.disposables = new CompositeDisposable(
      atom.config.observe("scrollmap-cursors.showAll", (value) => {
        this.showAll = value;
      }),
      atom.config.observe("scrollmap-cursors.threshold", (value) => {
        this.threshold = value;
      }),
      atom.config.observe("scrollmap-cursors.inactiveShow", (value) => {
        this.inactiveShow = value;
      }),
      atom.config.observe("scrollmap-cursors.showSelections", (value) => {
        this.showSelections = value;
      }),
    );
  },

  deactivate() {
    this.disposables.dispose();
  },

  provideScrollmapLayer() {
    return {
      name: "cursors",
      description: "Cursor and selection markers",
      initialize: ({ editor, update, disposables }) => {
        disposables.add(
          editor.observeCursors(update),
          editor.onDidRemoveCursor(update),
          editor.onDidChangeCursorPosition(update),
          editor.onDidChangeSelectionRange(update),
          atom.config.onDidChange("scrollmap-cursors.showAll", update),
          atom.config.onDidChange("scrollmap-cursors.threshold", update),
          atom.config.onDidChange("scrollmap-cursors.inactiveShow", update),
          atom.config.onDidChange("scrollmap-cursors.showSelections", update),
          atom.workspace.onDidChangeActiveTextEditor(update),
        );
      },
      getItems: ({ editor }) => {
        if (!this.inactiveShow && atom.workspace.getActiveTextEditor() !== editor) {
          return [];
        }
        const items = this.getCursorItems(editor);
        if (this.threshold && items.length > this.threshold) {
          return [];
        }
        if (this.showSelections) {
          // Selections render below the cursors that own them.
          items.unshift(...this.getSelectionItems(editor));
        }
        return items;
      },
    };
  },

  // One item per cursor row, merging cursors sitting on adjacent rows.
  getCursorItems(editor) {
    const positions = this.showAll
      ? editor.getCursorScreenPositions()
      : [editor.getCursorScreenPosition()];
    positions.sort((a, b) => a.row - b.row);
    const items = [];
    let lastItem = null;
    for (const position of positions) {
      if (lastItem && position.row <= (lastItem.end ?? lastItem.row) + 1) {
        lastItem.end = position.row;
      } else {
        if (lastItem) items.push(lastItem);
        lastItem = { row: position.row };
      }
    }
    if (lastItem) items.push(lastItem);
    return items;
  },

  // One full-width item per non-empty selection.
  getSelectionItems(editor) {
    const ranges = this.showAll
      ? editor.getSelectedScreenRanges()
      : [editor.getLastSelection().getScreenRange()];
    const items = [];
    for (const range of ranges) {
      if (range.isEmpty()) {
        continue;
      }
      // A selection ending at column 0 does not cover its last row.
      const end =
        range.end.column === 0 && range.end.row > range.start.row
          ? range.end.row - 1
          : range.end.row;
      items.push({ row: range.start.row, end, position: "full", cls: "selection" });
    }
    return items;
  },
};
