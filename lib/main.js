const { CompositeDisposable, Disposable } = require("atom");

module.exports = {
  activate() {
    // Every live layer, over all editors and all renderers. The settings below
    // and the active editor answer the same question for every one of them, so
    // they are subscribed once here and fanned out, rather than re-subscribed
    // in each layer -- which with two renderers would be twice per editor.
    this.layers = new Set();
    this.disposables = new CompositeDisposable(
      atom.config.observe("marker-cursors.showAll", (value) => {
        this.showAll = value;
        this.updateLayers();
      }),
      atom.config.observe("marker-cursors.threshold", (value) => {
        this.threshold = value;
        this.updateLayers();
      }),
      atom.config.observe("marker-cursors.inactiveShow", (value) => {
        this.inactiveShow = value;
        this.updateLayers();
      }),
      atom.config.observe("marker-cursors.showSelections", (value) => {
        this.showSelections = value;
        this.updateLayers();
      }),
      atom.workspace.onDidChangeActiveTextEditor(() => this.updateLayers()),
    );
  },

  deactivate() {
    this.disposables.dispose();
    this.layers.clear();
  },

  updateLayers() {
    for (const layer of this.layers) {
      layer.update();
    }
  },

  provideMarkerLayer() {
    return {
      name: "cursors",
      description: "Cursor and selection markers",
      initialize: (layer) => {
        this.layers.add(layer);
        layer.disposables.add(
          new Disposable(() => this.layers.delete(layer)),
          layer.editor.observeCursors(layer.update),
          layer.editor.onDidRemoveCursor(layer.update),
          layer.editor.onDidChangeCursorPosition(layer.update),
          layer.editor.onDidChangeSelectionRange(layer.update),
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
