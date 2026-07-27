const { CompositeDisposable } = require("atom");

describe("marker-cursors", () => {
  let workspaceElement, editor, mainModule, provider, layer, layers;

  // Minimal stand-in for the layer object a renderer's marker host passes to
  // `initialize` and `getItems` (see lib/layer.js in the marker package).
  function makeLayer(targetEditor) {
    const fake = {
      editor: targetEditor,
      props: provider,
      cache: new Map(),
      items: [],
      disposables: new CompositeDisposable(),
    };
    fake.update = jasmine.createSpy("update").and.callFake(() => {
      const items = provider.getItems(fake);
      if (items) {
        fake.items = items;
      }
    });
    fake.updateSync = fake.update;
    layers.push(fake);
    if (provider.initialize) {
      provider.initialize(fake);
    }
    return fake;
  }

  beforeEach(async () => {
    workspaceElement = atom.views.getView(atom.workspace);
    jasmine.attachToDOM(workspaceElement);
    const pack = await atom.packages.activatePackage("marker-cursors");
    mainModule = pack.mainModule;
    provider = mainModule.provideMarkerLayer();
    editor = await atom.workspace.open();
    editor.setText(Array(50).fill("hello world").join("\n"));
    layers = [];
    layer = makeLayer(editor);
  });

  afterEach(() => {
    for (const fake of layers) {
      fake.disposables.dispose();
    }
  });

  it("activates and provides a marker layer descriptor", () => {
    expect(atom.packages.isPackageActive("marker-cursors")).toBe(true);
    expect(provider.name).toBe("cursors");
    expect(typeof provider.description).toBe("string");
    expect(typeof provider.initialize).toBe("function");
    expect(typeof provider.getItems).toBe("function");
  });

  it("returns one item per cursor screen row", () => {
    editor.setCursorScreenPosition([0, 0]);
    editor.addCursorAtScreenPosition([10, 0]);
    editor.addCursorAtScreenPosition([20, 0]);
    layer.update();
    expect(layer.items).toEqual([{ row: 0 }, { row: 10 }, { row: 20 }]);
  });

  it("merges cursors on adjacent rows into a single ranged item", () => {
    editor.setCursorScreenPosition([5, 0]);
    editor.addCursorAtScreenPosition([6, 0]);
    editor.addCursorAtScreenPosition([7, 0]);
    editor.addCursorAtScreenPosition([20, 0]);
    layer.update();
    expect(layer.items).toEqual([{ row: 5, end: 7 }, { row: 20 }]);
  });

  it("only shows the last cursor when showAll is disabled", () => {
    atom.config.set("marker-cursors.showAll", false);
    editor.setCursorScreenPosition([3, 0]);
    editor.addCursorAtScreenPosition([12, 0]);
    layer.update();
    expect(layer.items).toEqual([{ row: 12 }]);
  });

  it("returns a full width item per non-empty selection, ahead of the cursors", () => {
    editor.setSelectedScreenRange([
      [3, 2],
      [8, 4],
    ]);
    layer.update();
    expect(layer.items).toEqual([
      { row: 3, end: 8, position: "full", cls: "selection" },
      { row: 8 },
    ]);
  });

  it("ignores empty selections", () => {
    editor.setCursorScreenPosition([6, 0]);
    layer.update();
    expect(layer.items).toEqual([{ row: 6 }]);
  });

  it("does not extend a selection onto a trailing row it only touches at column 0", () => {
    editor.setSelectedScreenRange([
      [3, 2],
      [8, 0],
    ]);
    layer.update();
    expect(layer.items[0]).toEqual({ row: 3, end: 7, position: "full", cls: "selection" });
  });

  it("keeps a single-row selection on its own row", () => {
    editor.setSelectedScreenRange([
      [4, 1],
      [4, 6],
    ]);
    layer.update();
    expect(layer.items[0]).toEqual({ row: 4, end: 4, position: "full", cls: "selection" });
  });

  it("returns an item per selection and only the last one when showAll is disabled", () => {
    editor.setSelectedScreenRanges([
      [
        [1, 0],
        [2, 3],
      ],
      [
        [10, 0],
        [11, 3],
      ],
    ]);
    layer.update();
    expect(layer.items.filter((item) => item.cls === "selection")).toEqual([
      { row: 1, end: 2, position: "full", cls: "selection" },
      { row: 10, end: 11, position: "full", cls: "selection" },
    ]);

    atom.config.set("marker-cursors.showAll", false);
    layer.update();
    expect(layer.items.filter((item) => item.cls === "selection")).toEqual([
      { row: 10, end: 11, position: "full", cls: "selection" },
    ]);
  });

  it("omits selection markers when showSelections is disabled", () => {
    atom.config.set("marker-cursors.showSelections", false);
    editor.setSelectedScreenRange([
      [3, 2],
      [8, 4],
    ]);
    layer.update();
    expect(layer.items).toEqual([{ row: 8 }]);
  });

  it("hides all markers when the item count exceeds the threshold", () => {
    atom.config.set("marker-cursors.threshold", 1);
    editor.setCursorScreenPosition([0, 0]);
    editor.addCursorAtScreenPosition([10, 0]);
    layer.update();
    expect(layer.items).toEqual([]);
  });

  it("hides markers in inactive editors when inactiveShow is disabled", async () => {
    atom.config.set("marker-cursors.inactiveShow", false);
    editor.setCursorScreenPosition([4, 0]);
    await atom.workspace.open();
    layer.update();
    expect(layer.items).toEqual([]);

    atom.config.set("marker-cursors.inactiveShow", true);
    layer.update();
    expect(layer.items).toEqual([{ row: 4 }]);
  });

  it("updates the layer when cursors are added, moved, or removed", () => {
    layer.update.calls.reset();
    const cursor = editor.addCursorAtScreenPosition([15, 0]);
    expect(layer.update).toHaveBeenCalled();

    layer.update.calls.reset();
    cursor.setScreenPosition([16, 0]);
    expect(layer.update).toHaveBeenCalled();

    layer.update.calls.reset();
    cursor.destroy();
    expect(layer.update).toHaveBeenCalled();
  });

  it("updates the layer when a selection range changes", () => {
    layer.update.calls.reset();
    editor.setSelectedScreenRange([
      [2, 0],
      [5, 0],
    ]);
    expect(layer.update).toHaveBeenCalled();
  });

  it("updates the layer when the settings change", () => {
    layer.update.calls.reset();
    atom.config.set("marker-cursors.showAll", false);
    atom.config.set("marker-cursors.threshold", 5);
    atom.config.set("marker-cursors.inactiveShow", false);
    atom.config.set("marker-cursors.showSelections", false);
    expect(layer.update.calls.count()).toBe(4);
  });

  it("subscribes to the settings once for the package, not once per editor", async () => {
    // The observers were hoisted out of initialize() into activate(). If one
    // moved back, every extra editor's layer would add its own observer and
    // fan a single settings change out once per layer instead of once.
    const otherEditor = await atom.workspace.open();
    spyOn(atom.config, "observe").and.callThrough();
    const second = makeLayer(otherEditor);
    expect(atom.config.observe).not.toHaveBeenCalled();

    layer.update.calls.reset();
    second.update.calls.reset();
    atom.config.set("marker-cursors.threshold", 5);

    expect(layer.update.calls.count()).toBe(1);
    expect(second.update.calls.count()).toBe(1);
  });
});
