import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'ifmp_flow_nav_collapsed'

/** Wide enough for the rail; below this the nav is already a horizontal row. */
export const RAIL_MIN_WIDTH = 900

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // Private mode or blocked storage: collapse state is a preference, not
    // data. Fall back to expanded rather than failing the shell.
    return false
  }
}

/**
 * Collapse state for the navigation rail, persisted across sessions.
 *
 * The rail is a desktop affordance only. Below RAIL_MIN_WIDTH the nav renders
 * as a horizontal chip row, so this reports `false` there and the toggle is
 * hidden — a collapsed rail on a narrow screen would be a dead 64px column.
 */
export function useNavCollapsed() {
  const [collapsed, setCollapsed] = useState(readStored)
  const [isRailCapable, setIsRailCapable] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth > RAIL_MIN_WIDTH,
  )

  useEffect(() => {
    function onResize() {
      setIsRailCapable(window.innerWidth > RAIL_MIN_WIDTH)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        // Preference is best-effort; the in-memory toggle still works.
      }
      return next
    })
  }, [])

  return { collapsed: collapsed && isRailCapable, isRailCapable, toggle }
}
