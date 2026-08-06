# marker-cursors

Show cursor positions and selections on the scrollbar and minimap.

A marker layer package, drawn by [scrollmap](https://github.com/lumine-code/scrollmap) and [minimap](https://github.com/lumine-code/minimap).

## Features

- **Cursor markers**: shows every cursor position on both maps.
- **Selection markers**: shows every selected range as a translucent full width band.
- **Range merging**: adjacent cursor rows are merged into a single marker.
- **Threshold**: hides markers when the cursor count exceeds a configurable limit; the limit is applied while computing the items, so it is deliberately not scaled by the maps' thresholdScale.
- **Inactive editors**: optionally hides markers in editors that are not focused.

## Installation

To install `marker-cursors` search for _marker-cursors_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/marker-cursors`.

## Customization

The marker style can be adjusted in the `styles.css` file, e.g. change the marker color and how strongly the selection band is tinted:

```css
.marker.marker-cursors {
  background-color: var(--text-color-info);
}

.marker.marker-cursors.selection {
  opacity: 0.4;
}
```

## Services

- **marker.layer** (`1.0.0`): provided to render cursor position and selection markers as a layer on the editor's overview maps.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
