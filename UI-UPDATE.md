# Sudoku UI integration

The approved forest palette, uppercase title, timer/difficulty type sizes, board values and pencil marks are retained. The outer border and continuous overlaid 3×3 separators share the same 3px sage stroke; individual cell lines retain the original gap-and-border treatment.

Home keeps the saved puzzle available to resume. The timer stops on Home, Settings, and Best times. Reload opens Home without discarding the puzzle, notes, or undo history. Choosing a new puzzle asks before replacing an unfinished game. Selecting the same in-progress daily puzzle resumes it.

Play controls use a four-button toolbar and a 3×3 number pad. Logical hints appear in a dismissible card with a separate apply action. Reveal solution lives in Settings and still requires confirmation.

The approved pepper artwork is preserved intact in `assets/pepper-tiers.png`. CSS sprite windows show each pepper without its presentation label. Home, the game difficulty control, the resume summary, and the completion screen use those icons.

Existing local saved-game and statistics keys are unchanged. Keep the same browser and URL/origin to retain existing local progress. Local HTML opening works; installation and offline caching require HTTP(S). The service worker cache includes the stylesheet and pepper artwork.

Run the regression suite from this folder:

```
node sudoku-tests.cjs
```

Browser checks completed at 320px, 390px, and 1024px widths, including visual review of the Home icons, board borders and hint card; save/reload/resume and secondary-screen navigation were exercised. Browser console errors were absent during these checks.
