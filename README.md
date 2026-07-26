# scrollmap-cursors

Show cursor positions and selections on the scrollbar.

A layer package for [scrollmap](https://github.com/lumine-code/scrollmap).

## Features

- **Cursor markers**: shows every cursor position on the scrollbar.
- **Selection markers**: shows every selected range as a translucent full width band.
- **Range merging**: adjacent cursor rows are merged into a single marker.
- **Threshold**: hides markers when the cursor count exceeds a configurable limit.
- **Inactive editors**: optionally hides markers in editors that are not focused.

## Installation

To install `scrollmap-cursors` search for _scrollmap-cursors_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/scrollmap-cursors`.

## Customization

The marker style can be adjusted in the `styles.less` file, e.g. change the marker color and how strongly the selection band is tinted:

```less
.scrollmap .marker.marker-cursors {
  background-color: var(--text-color-info);
}

.scrollmap .marker.marker-cursors.selection {
  opacity: 0.4;
}
```

## Services

- **scrollmap.layer** (`1.0.0`): provided to render cursor position and selection markers as a layer on the editor scrollbar.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
