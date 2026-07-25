const { CompositeDisposable } = require("atom");

describe("scrollmap-cursors", () => {
  let workspaceElement, editor, mainModule, provider, layer;

  // Minimal stand-in for the layer object the scrollmap hub passes to
  // `initialize` and `getItems` (see lumine-code/scrollmap lib/layer.js).
  function makeLayer(targetEditor) {
    const fake = {
      editor: targetEditor,
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
    fake.refresh = () => {};
    targetEditor.scrollmap = {
      layers: new Map([[provider.name, fake]]),
      updateView() {},
    };
    if (provider.initialize) {
      provider.initialize(fake);
    }
    return fake;
  }

  beforeEach(async () => {
    workspaceElement = atom.views.getView(atom.workspace);
    jasmine.attachToDOM(workspaceElement);
    const pack = await atom.packages.activatePackage("scrollmap-cursors");
    mainModule = pack.mainModule;
    provider = mainModule.provideScrollmap();
    editor = await atom.workspace.open();
    editor.setText(Array(50).fill("hello world").join("\n"));
    layer = makeLayer(editor);
  });

  afterEach(() => {
    layer.disposables.dispose();
  });

  it("activates and provides a scrollmap layer descriptor", () => {
    expect(atom.packages.isPackageActive("scrollmap-cursors")).toBe(true);
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
    atom.config.set("scrollmap-cursors.showAll", false);
    editor.setCursorScreenPosition([3, 0]);
    editor.addCursorAtScreenPosition([12, 0]);
    layer.update();
    expect(layer.items).toEqual([{ row: 12 }]);
  });

  it("hides all markers when the item count exceeds the threshold", () => {
    atom.config.set("scrollmap-cursors.threshold", 1);
    editor.setCursorScreenPosition([0, 0]);
    editor.addCursorAtScreenPosition([10, 0]);
    layer.update();
    expect(layer.items).toEqual([]);
  });

  it("hides markers in inactive editors when inactiveShow is disabled", async () => {
    atom.config.set("scrollmap-cursors.inactiveShow", false);
    editor.setCursorScreenPosition([4, 0]);
    await atom.workspace.open();
    layer.update();
    expect(layer.items).toEqual([]);

    atom.config.set("scrollmap-cursors.inactiveShow", true);
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

  it("updates the layer when the settings change", () => {
    layer.update.calls.reset();
    atom.config.set("scrollmap-cursors.showAll", false);
    atom.config.set("scrollmap-cursors.threshold", 5);
    atom.config.set("scrollmap-cursors.inactiveShow", false);
    expect(layer.update.calls.count()).toBe(3);
  });
});
