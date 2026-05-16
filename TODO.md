# TODO - Fix RTL sidebar overlap and profile content cutoff

## Plan (will be executed after approval)
- [ ] Fix RTL: in layout that uses fixed panel sidebar, update `PanelLayout.css` so `.layout-main` padding shifts from `padding-left` to `padding-right` when `html[dir="rtl"]`.
- [ ] Fix RTL: ensure overlay and z-index behavior doesn’t cause sidebar to visually “stick” into content on `/profile`.
- [ ] Fix content cutoff: update `Profile.css` (and/or relevant wrapper) to remove `overflow: hidden` on `.profile` so page scroll works and posts/composer aren’t clipped.
- [ ] Verify by running frontend and checking `/profile` in RTL.

