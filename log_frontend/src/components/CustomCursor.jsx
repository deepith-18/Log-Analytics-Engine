// src/components/CustomCursor.jsx
// Smooth custom cursor with trailing ring and hover state detection.

import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const dotRef  = useRef()
  const ringRef = useRef()
  const pos     = useRef({ x: 0, y: 0 })
  const ring    = useRef({ x: 0, y: 0 })
  const rafRef  = useRef()

  useEffect(() => {
    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY }
    }

    const onEnterInteractive = () => {
      if (ringRef.current) {
        ringRef.current.style.width  = '52px'
        ringRef.current.style.height = '52px'
        ringRef.current.style.borderColor = 'rgba(0,245,255,0.8)'
      }
    }

    const onLeaveInteractive = () => {
      if (ringRef.current) {
        ringRef.current.style.width  = '36px'
        ringRef.current.style.height = '36px'
        ringRef.current.style.borderColor = 'rgba(0,245,255,0.5)'
      }
    }

    window.addEventListener('mousemove', onMove)

    // Add listeners to all interactive elements
    const interactives = document.querySelectorAll('button, a, [role="button"], input')
    interactives.forEach(el => {
      el.addEventListener('mouseenter', onEnterInteractive)
      el.addEventListener('mouseleave', onLeaveInteractive)
    })

    // Smooth follow animation
    const animate = () => {
      if (dotRef.current) {
        dotRef.current.style.left = pos.current.x + 'px'
        dotRef.current.style.top  = pos.current.y + 'px'
      }

      // Ring follows with lerp (smooth lag)
      ring.current.x += (pos.current.x - ring.current.x) * 0.12
      ring.current.y += (pos.current.y - ring.current.y) * 0.12

      if (ringRef.current) {
        ringRef.current.style.left = ring.current.x + 'px'
        ringRef.current.style.top  = ring.current.y + 'px'
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        className="cursor-dot"
      />
      <div
        ref={ringRef}
        className="cursor-ring"
      />
    </>
  )
}